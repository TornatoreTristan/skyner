import { injectable } from 'inversify'
import type {
  AmadeusAuthResponse,
  AmadeusFlightSearchParams,
  AmadeusFlightSearchResponse,
  AmadeusError,
} from './types/amadeus.js'

@injectable()
export default class AmadeusClient {
  private readonly apiKey: string
  private readonly apiSecret: string
  private readonly baseUrl: string
  private accessToken: string | null = null
  private tokenExpiresAt: number = 0

  constructor() {
    this.apiKey = process.env.AMADEUS_API_KEY || ''
    this.apiSecret = process.env.AMADEUS_API_SECRET || ''
    this.baseUrl =
      process.env.AMADEUS_API_URL || 'https://test.api.amadeus.com'

    if (!this.apiKey || !this.apiSecret) {
      throw new Error(
        'AMADEUS_API_KEY and AMADEUS_API_SECRET must be set in environment variables'
      )
    }
  }

  /**
   * Obtenir un token d'accès OAuth2
   */
  private async getAccessToken(): Promise<string> {
    // Si le token est encore valide, le réutiliser
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken
    }

    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.apiKey,
      client_secret: this.apiSecret,
    })

    const response = await fetch(`${this.baseUrl}/v1/security/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    if (!response.ok) {
      const error = (await response.json()) as AmadeusError
      throw new Error(
        `Amadeus authentication failed: ${error.errors?.[0]?.detail || response.statusText}`
      )
    }

    const data = (await response.json()) as AmadeusAuthResponse

    this.accessToken = data.access_token
    // Expiration : 30 minutes avant l'expiration réelle pour sécurité
    this.tokenExpiresAt = Date.now() + (data.expires_in - 1800) * 1000

    return this.accessToken
  }

  /**
   * Rechercher des vols
   */
  async searchFlights(
    params: AmadeusFlightSearchParams
  ): Promise<AmadeusFlightSearchResponse> {
    const token = await this.getAccessToken()

    // Construction des paramètres de requête
    const searchParams = new URLSearchParams({
      originLocationCode: params.originLocationCode,
      destinationLocationCode: params.destinationLocationCode,
      departureDate: params.departureDate,
      adults: params.adults.toString(),
    })

    if (params.returnDate) {
      searchParams.append('returnDate', params.returnDate)
    }

    if (params.children) {
      searchParams.append('children', params.children.toString())
    }

    if (params.travelClass) {
      searchParams.append('travelClass', params.travelClass)
    }

    if (params.nonStop !== undefined) {
      searchParams.append('nonStop', params.nonStop.toString())
    }

    if (params.currencyCode) {
      searchParams.append('currencyCode', params.currencyCode)
    }

    if (params.maxPrice) {
      searchParams.append('maxPrice', params.maxPrice.toString())
    }

    if (params.max) {
      searchParams.append('max', params.max.toString())
    }

    const url = `${this.baseUrl}/v2/shopping/flight-offers?${searchParams.toString()}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = (await response.json()) as AmadeusError
      throw new Error(
        `Amadeus flight search failed: ${error.errors?.[0]?.detail || response.statusText}`
      )
    }

    return (await response.json()) as AmadeusFlightSearchResponse
  }

  /**
   * Vérifier si le client est configuré correctement
   */
  isConfigured(): boolean {
    return !!this.apiKey && !!this.apiSecret
  }

  /**
   * Tester la connexion à l'API
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getAccessToken()
      return true
    } catch {
      return false
    }
  }
}
