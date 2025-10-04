import { injectable, inject } from 'inversify'
import { DateTime } from 'luxon'
import { TYPES } from '#shared/container/types'
import FlightRepository from '#flights/repositories/flight_repository'
import PriceHistoryRepository from '#flights/repositories/price_history_repository'
import DestinationRepository from '#destinations/repositories/destination_repository'
import AmadeusClient from '#integrations/amadeus/amadeus_client'
import Flight from '#flights/models/flight'
import type { AmadeusFlightOffer, AmadeusFlightSearchParams } from '#integrations/amadeus/types/amadeus'

export interface SearchFlightsOptions {
  saveToDatabase?: boolean
  recordPriceHistory?: boolean
  maxResults?: number
}

export interface FlightSearchResult {
  flights: Flight[]
  totalFound: number
  cheapestPrice: number | null
  averagePrice: number | null
}

@injectable()
export default class FlightSearchService {
  constructor(
    @inject(TYPES.FlightRepository) private flightRepo: FlightRepository,
    @inject(TYPES.PriceHistoryRepository) private priceHistoryRepo: PriceHistoryRepository,
    @inject(TYPES.DestinationRepository) private destinationRepo: DestinationRepository
  ) {}

  /**
   * Rechercher des vols pour une destination
   */
  async searchForDestination(
    destinationId: number,
    options: SearchFlightsOptions = {}
  ): Promise<FlightSearchResult> {
    const { saveToDatabase = true, recordPriceHistory = true, maxResults = 50 } = options

    // Récupérer la destination
    const destination = await this.destinationRepo.findByIdOrFail(destinationId)

    // Construire les paramètres de recherche Amadeus
    const searchParams: AmadeusFlightSearchParams = {
      originLocationCode: destination.origin,
      destinationLocationCode: destination.destination,
      departureDate: destination.departureDate.toFormat('yyyy-MM-dd'),
      returnDate: destination.returnDate?.toFormat('yyyy-MM-dd'),
      adults: destination.adults,
      children: destination.children > 0 ? destination.children : undefined,
      currencyCode: destination.currency,
      maxPrice: destination.maxBudget || undefined,
      max: maxResults,
    }

    // Appliquer les préférences si présentes
    if (destination.preferences) {
      if (destination.preferences.directFlightsOnly) {
        searchParams.nonStop = true
      }
      if (destination.preferences.cabinClass) {
        const cabinClass = destination.preferences.cabinClass.toUpperCase()
        searchParams.travelClass = cabinClass as any
      }
    }

    // Appeler l'API Amadeus
    const amadeusClient = new AmadeusClient()
    const response = await amadeusClient.searchFlights(searchParams)

    if (!response.data || response.data.length === 0) {
      return {
        flights: [],
        totalFound: 0,
        cheapestPrice: null,
        averagePrice: null,
      }
    }

    // Mapper les résultats Amadeus vers nos modèles
    const flights: Flight[] = []
    let totalPrice = 0
    let cheapestPrice: number | null = null

    for (const offer of response.data) {
      const mappedFlight = this.mapAmadeusOfferToFlight(offer, destinationId)

      if (saveToDatabase) {
        const saved = await this.flightRepo.create(mappedFlight as any, {
          cache: { tags: ['flights', `destination_${destinationId}_flights`] },
        })
        flights.push(saved)
      } else {
        flights.push(mappedFlight as Flight)
      }

      const price = parseFloat(offer.price.total)
      totalPrice += price

      if (cheapestPrice === null || price < cheapestPrice) {
        cheapestPrice = price
      }
    }

    // Enregistrer le prix le plus bas dans l'historique
    if (recordPriceHistory && cheapestPrice !== null) {
      await this.priceHistoryRepo.create(
        {
          destinationId,
          price: cheapestPrice,
          currency: destination.currency,
          scannedAt: DateTime.now(),
          metadata: {
            airline: flights[0]?.airline,
            stops: flights[0]?.stops,
            departureDate: destination.departureDate.toFormat('yyyy-MM-dd'),
            returnDate: destination.returnDate?.toFormat('yyyy-MM-dd'),
            source: 'amadeus',
          },
        } as any,
        {
          cache: { tags: ['price_histories', `destination_${destinationId}_history`] },
        }
      )
    }

    const averagePrice = flights.length > 0 ? totalPrice / flights.length : null

    return {
      flights,
      totalFound: response.meta.count,
      cheapestPrice,
      averagePrice,
    }
  }

  /**
   * Mapper une offre Amadeus vers notre modèle Flight
   */
  private mapAmadeusOfferToFlight(
    offer: AmadeusFlightOffer,
    destinationId: number
  ): Partial<Flight> {
    const itinerary = offer.itineraries[0]
    const firstSegment = itinerary.segments[0]
    const lastSegment = itinerary.segments[itinerary.segments.length - 1]

    // Calculer le nombre d'escales
    const stops = itinerary.segments.length - 1

    // Extraire la compagnie aérienne principale
    const airline = offer.validatingAirlineCodes[0] || firstSegment.carrierCode

    // Calculer la durée totale en minutes
    const duration = this.parseDuration(itinerary.duration)

    // URL de réservation (à adapter selon votre système)
    const bookingUrl = `https://www.amadeus.com/booking/${offer.id}`

    return {
      destinationId,
      airline,
      price: parseFloat(offer.price.total),
      currency: offer.price.currency,
      departureDate: DateTime.fromISO(firstSegment.departure.at),
      returnDate: offer.itineraries[1]
        ? DateTime.fromISO(offer.itineraries[1].segments[0].departure.at)
        : null,
      stops,
      duration,
      bookingUrl,
      source: 'amadeus',
      metadata: {
        departureAirport: firstSegment.departure.iataCode,
        arrivalAirport: lastSegment.arrival.iataCode,
        departureTime: firstSegment.departure.at,
        arrivalTime: lastSegment.arrival.at,
        segments: itinerary.segments.map((seg) => ({
          airline: seg.carrierCode,
          flightNumber: seg.number,
          departure: seg.departure.iataCode,
          arrival: seg.arrival.iataCode,
          duration: this.parseDuration(seg.duration),
        })),
      },
    }
  }

  /**
   * Parser une durée ISO 8601 (ex: PT2H30M) en minutes
   */
  private parseDuration(isoDuration: string): number {
    const matches = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
    if (!matches) return 0

    const hours = matches[1] ? parseInt(matches[1]) : 0
    const minutes = matches[2] ? parseInt(matches[2]) : 0

    return hours * 60 + minutes
  }

  /**
   * Recherche rapide sans sauvegarder
   */
  async quickSearch(
    origin: string,
    destination: string,
    departureDate: string,
    returnDate?: string,
    adults: number = 1
  ): Promise<FlightSearchResult> {
    const amadeusClient = new AmadeusClient()

    const response = await amadeusClient.searchFlights({
      originLocationCode: origin,
      destinationLocationCode: destination,
      departureDate,
      returnDate,
      adults,
      max: 20,
    })

    if (!response.data || response.data.length === 0) {
      return {
        flights: [],
        totalFound: 0,
        cheapestPrice: null,
        averagePrice: null,
      }
    }

    const flights = response.data.map((offer) =>
      this.mapAmadeusOfferToFlight(offer, 0)
    ) as Flight[]

    let totalPrice = 0
    let cheapestPrice: number | null = null

    for (const offer of response.data) {
      const price = parseFloat(offer.price.total)
      totalPrice += price
      if (cheapestPrice === null || price < cheapestPrice) {
        cheapestPrice = price
      }
    }

    const averagePrice = flights.length > 0 ? totalPrice / flights.length : null

    return {
      flights,
      totalFound: response.meta.count,
      cheapestPrice,
      averagePrice,
    }
  }

  /**
   * Récupérer les vols d'une destination
   */
  async getFlightsForDestination(destinationId: number): Promise<Flight[]> {
    return this.flightRepo.findByDestinationId(destinationId)
  }

  /**
   * Récupérer les vols les moins chers
   */
  async getCheapestFlights(destinationId: number, limit: number = 10): Promise<Flight[]> {
    return this.flightRepo.findCheapestByDestinationId(destinationId, limit)
  }
}
