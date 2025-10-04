import { test } from '@japa/runner'
import FlightRepository from '#flights/repositories/flight_repository'
import Flight from '#flights/models/flight'
import Destination from '#destinations/models/destination'
import User from '#users/models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'

test.group('FlightRepository', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  let user: User
  let destination: Destination

  group.each.setup(async () => {
    user = await User.create({
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User',
    })

    destination = await Destination.create({
      userId: user.id,
      origin: 'CDG',
      destination: 'NRT',
      departureDate: DateTime.now().plus({ days: 30 }),
      adults: 1,
      children: 0,
      currency: 'EUR',
    } as any)
  })

  test('devrait créer un nouveau vol', async ({ assert }) => {
    const repository = new FlightRepository()
    const flightData = {
      destinationId: destination.id,
      airline: 'AF',
      price: 850.50,
      currency: 'EUR',
      departureDate: DateTime.now().plus({ days: 30 }),
      returnDate: DateTime.now().plus({ days: 37 }),
      stops: 1,
      duration: 780,
      bookingUrl: 'https://example.com/booking',
      source: 'amadeus',
    }

    const result = await repository.create(flightData as any)

    assert.isObject(result)
    assert.equal(result.destinationId, flightData.destinationId)
    assert.equal(result.airline, flightData.airline)
    assert.equal(result.price, flightData.price)
    assert.equal(result.stops, flightData.stops)
    assert.equal(result.source, flightData.source)
  })

  test('devrait trouver tous les vols d\'une destination', async ({ assert }) => {
    const repository = new FlightRepository()

    await Flight.create({
      destinationId: destination.id,
      airline: 'AF',
      price: 850,
      currency: 'EUR',
      departureDate: DateTime.now().plus({ days: 30 }),
      stops: 0,
      source: 'amadeus',
    } as any)

    await Flight.create({
      destinationId: destination.id,
      airline: 'JL',
      price: 920,
      currency: 'EUR',
      departureDate: DateTime.now().plus({ days: 30 }),
      stops: 1,
      source: 'amadeus',
    } as any)

    const result = await repository.findByDestinationId(destination.id)

    assert.isArray(result)
    assert.lengthOf(result, 2)
    assert.isTrue(result.every((f) => f.destinationId === destination.id))
  })

  test('devrait trouver les vols les moins chers', async ({ assert }) => {
    const repository = new FlightRepository()

    await Flight.create({
      destinationId: destination.id,
      airline: 'AF',
      price: 1000,
      currency: 'EUR',
      departureDate: DateTime.now().plus({ days: 30 }),
      stops: 0,
      source: 'amadeus',
    } as any)

    await Flight.create({
      destinationId: destination.id,
      airline: 'JL',
      price: 750,
      currency: 'EUR',
      departureDate: DateTime.now().plus({ days: 30 }),
      stops: 1,
      source: 'amadeus',
    } as any)

    await Flight.create({
      destinationId: destination.id,
      airline: 'BA',
      price: 850,
      currency: 'EUR',
      departureDate: DateTime.now().plus({ days: 30 }),
      stops: 2,
      source: 'amadeus',
    } as any)

    const result = await repository.findCheapestByDestinationId(destination.id, 2)

    assert.isArray(result)
    assert.lengthOf(result, 2)
    assert.equal(result[0].price, 750)
    assert.equal(result[1].price, 850)
  })

  test('devrait trouver les vols directs', async ({ assert }) => {
    const repository = new FlightRepository()

    await Flight.create({
      destinationId: destination.id,
      airline: 'AF',
      price: 950,
      currency: 'EUR',
      departureDate: DateTime.now().plus({ days: 30 }),
      stops: 0,
      source: 'amadeus',
    } as any)

    await Flight.create({
      destinationId: destination.id,
      airline: 'JL',
      price: 750,
      currency: 'EUR',
      departureDate: DateTime.now().plus({ days: 30 }),
      stops: 1,
      source: 'amadeus',
    } as any)

    const result = await repository.findDirectFlightsByDestinationId(destination.id)

    assert.isArray(result)
    assert.lengthOf(result, 1)
    assert.equal(result[0].stops, 0)
    assert.equal(result[0].airline, 'AF')
  })

  test('devrait calculer le prix moyen', async ({ assert }) => {
    const repository = new FlightRepository()

    await Flight.create({
      destinationId: destination.id,
      airline: 'AF',
      price: 800,
      currency: 'EUR',
      departureDate: DateTime.now().plus({ days: 30 }),
      stops: 0,
      source: 'amadeus',
    } as any)

    await Flight.create({
      destinationId: destination.id,
      airline: 'JL',
      price: 900,
      currency: 'EUR',
      departureDate: DateTime.now().plus({ days: 30 }),
      stops: 1,
      source: 'amadeus',
    } as any)

    await Flight.create({
      destinationId: destination.id,
      airline: 'BA',
      price: 1000,
      currency: 'EUR',
      departureDate: DateTime.now().plus({ days: 30 }),
      stops: 2,
      source: 'amadeus',
    } as any)

    const avgPrice = await repository.getAveragePriceByDestinationId(destination.id)

    assert.equal(avgPrice, 900)
  })

  test('devrait trouver les derniers vols scannés', async ({ assert }) => {
    const repository = new FlightRepository()

    const flight1 = await Flight.create({
      destinationId: destination.id,
      airline: 'AF',
      price: 800,
      currency: 'EUR',
      departureDate: DateTime.now().plus({ days: 30 }),
      stops: 0,
      source: 'amadeus',
    } as any)

    await new Promise((resolve) => setTimeout(resolve, 100))

    const flight2 = await Flight.create({
      destinationId: destination.id,
      airline: 'JL',
      price: 900,
      currency: 'EUR',
      departureDate: DateTime.now().plus({ days: 30 }),
      stops: 1,
      source: 'amadeus',
    } as any)

    const result = await repository.findLatestByDestinationId(destination.id, 10)

    assert.isArray(result)
    assert.lengthOf(result, 2)
    assert.equal(result[0].id, flight2.id)
    assert.equal(result[1].id, flight1.id)
  })

  test('devrait trouver le vol le moins cher', async ({ assert }) => {
    const repository = new FlightRepository()

    await Flight.create({
      destinationId: destination.id,
      airline: 'AF',
      price: 1000,
      currency: 'EUR',
      departureDate: DateTime.now().plus({ days: 30 }),
      stops: 0,
      source: 'amadeus',
    } as any)

    const cheapestFlight = await Flight.create({
      destinationId: destination.id,
      airline: 'JL',
      price: 650,
      currency: 'EUR',
      departureDate: DateTime.now().plus({ days: 30 }),
      stops: 1,
      source: 'amadeus',
    } as any)

    const result = await repository.findCheapestForDestination(destination.id)

    assert.isObject(result)
    assert.equal(result?.id, cheapestFlight.id)
    assert.equal(result?.price, 650)
  })

  test('devrait filtrer les vols par compagnie', async ({ assert }) => {
    const repository = new FlightRepository()

    await Flight.create({
      destinationId: destination.id,
      airline: 'AF',
      price: 800,
      currency: 'EUR',
      departureDate: DateTime.now().plus({ days: 30 }),
      stops: 0,
      source: 'amadeus',
    } as any)

    await Flight.create({
      destinationId: destination.id,
      airline: 'JL',
      price: 900,
      currency: 'EUR',
      departureDate: DateTime.now().plus({ days: 30 }),
      stops: 1,
      source: 'amadeus',
    } as any)

    const result = await repository.findByAirline('AF', destination.id)

    assert.isArray(result)
    assert.lengthOf(result, 1)
    assert.equal(result[0].airline, 'AF')
  })
})
