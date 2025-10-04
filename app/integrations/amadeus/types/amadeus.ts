/**
 * Types pour l'API Amadeus
 */

export interface AmadeusAuthResponse {
  access_token: string
  token_type: string
  expires_in: number
}

export interface AmadeusFlightOffer {
  id: string
  source: string
  instantTicketingRequired: boolean
  nonHomogeneous: boolean
  oneWay: boolean
  lastTicketingDate: string
  numberOfBookableSeats: number
  itineraries: AmadeusItinerary[]
  price: AmadeusPrice
  pricingOptions: {
    fareType: string[]
    includedCheckedBagsOnly: boolean
  }
  validatingAirlineCodes: string[]
  travelerPricings: AmadeusTravelerPricing[]
}

export interface AmadeusItinerary {
  duration: string // Format ISO 8601 (ex: PT2H30M)
  segments: AmadeusSegment[]
}

export interface AmadeusSegment {
  departure: AmadeusLocation
  arrival: AmadeusLocation
  carrierCode: string
  number: string
  aircraft: {
    code: string
  }
  operating?: {
    carrierCode: string
  }
  duration: string
  id: string
  numberOfStops: number
  blacklistedInEU: boolean
}

export interface AmadeusLocation {
  iataCode: string
  terminal?: string
  at: string // DateTime ISO 8601
}

export interface AmadeusPrice {
  currency: string
  total: string
  base: string
  fees?: AmadeusFee[]
  grandTotal: string
}

export interface AmadeusFee {
  amount: string
  type: string
}

export interface AmadeusTravelerPricing {
  travelerId: string
  fareOption: string
  travelerType: string
  price: AmadeusPrice
  fareDetailsBySegment: AmadeusFareDetail[]
}

export interface AmadeusFareDetail {
  segmentId: string
  cabin: string
  fareBasis: string
  brandedFare?: string
  class: string
  includedCheckedBags: {
    quantity: number
  }
}

export interface AmadeusFlightSearchParams {
  originLocationCode: string
  destinationLocationCode: string
  departureDate: string // Format YYYY-MM-DD
  returnDate?: string // Format YYYY-MM-DD
  adults: number
  children?: number
  infants?: number
  travelClass?: 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST'
  nonStop?: boolean
  currencyCode?: string
  maxPrice?: number
  max?: number // Nombre max de résultats (default: 250)
}

export interface AmadeusFlightSearchResponse {
  meta: {
    count: number
    links?: {
      self: string
    }
  }
  data: AmadeusFlightOffer[]
  dictionaries?: {
    locations?: Record<string, any>
    aircraft?: Record<string, any>
    currencies?: Record<string, any>
    carriers?: Record<string, any>
  }
}

export interface AmadeusError {
  errors: Array<{
    status: number
    code: number
    title: string
    detail: string
    source?: {
      parameter?: string
      pointer?: string
      example?: string
    }
  }>
}
