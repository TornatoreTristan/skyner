import { test } from '@japa/runner'
import PriceHistoryRepository from '#flights/repositories/price_history_repository'
import PriceHistory from '#flights/models/price_history'
import Destination from '#destinations/models/destination'
import User from '#users/models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'

test.group('PriceHistoryRepository', (group) => {
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

  test('devrait créer une entrée d\'historique de prix', async ({ assert }) => {
    const repository = new PriceHistoryRepository()
    const priceData = {
      destinationId: destination.id,
      price: 850.50,
      currency: 'EUR',
      scannedAt: DateTime.now(),
      metadata: {
        airline: 'AF',
        stops: 1,
        departureDate: '2025-11-15',
        source: 'amadeus',
      },
    }

    const result = await repository.create(priceData as any)

    assert.isObject(result)
    assert.equal(result.destinationId, priceData.destinationId)
    assert.equal(result.price, priceData.price)
    assert.equal(result.currency, priceData.currency)
    assert.deepEqual(result.metadata, priceData.metadata)
  })

  test('devrait trouver l\'historique d\'une destination', async ({ assert }) => {
    const repository = new PriceHistoryRepository()

    await PriceHistory.create({
      destinationId: destination.id,
      price: 850,
      currency: 'EUR',
      scannedAt: DateTime.now().minus({ days: 2 }),
    } as any)

    await PriceHistory.create({
      destinationId: destination.id,
      price: 900,
      currency: 'EUR',
      scannedAt: DateTime.now().minus({ days: 1 }),
    } as any)

    await PriceHistory.create({
      destinationId: destination.id,
      price: 820,
      currency: 'EUR',
      scannedAt: DateTime.now(),
    } as any)

    const result = await repository.findByDestinationId(destination.id)

    assert.isArray(result)
    assert.lengthOf(result, 3)
    assert.isTrue(result.every((p) => p.destinationId === destination.id))
  })

  test('devrait trouver l\'historique ordonné par date', async ({ assert }) => {
    const repository = new PriceHistoryRepository()

    const oldest = await PriceHistory.create({
      destinationId: destination.id,
      price: 850,
      currency: 'EUR',
      scannedAt: DateTime.now().minus({ days: 10 }),
    } as any)

    const middle = await PriceHistory.create({
      destinationId: destination.id,
      price: 900,
      currency: 'EUR',
      scannedAt: DateTime.now().minus({ days: 5 }),
    } as any)

    const newest = await PriceHistory.create({
      destinationId: destination.id,
      price: 820,
      currency: 'EUR',
      scannedAt: DateTime.now(),
    } as any)

    const result = await repository.findByDestinationIdOrdered(destination.id, 'asc')

    assert.isArray(result)
    assert.lengthOf(result, 3)
    assert.equal(result[0].id, oldest.id)
    assert.equal(result[1].id, middle.id)
    assert.equal(result[2].id, newest.id)
  })

  test('devrait trouver le prix le plus bas', async ({ assert }) => {
    const repository = new PriceHistoryRepository()

    await PriceHistory.create({
      destinationId: destination.id,
      price: 950,
      currency: 'EUR',
      scannedAt: DateTime.now().minus({ days: 2 }),
    } as any)

    const lowestPrice = await PriceHistory.create({
      destinationId: destination.id,
      price: 720,
      currency: 'EUR',
      scannedAt: DateTime.now().minus({ days: 1 }),
    } as any)

    await PriceHistory.create({
      destinationId: destination.id,
      price: 850,
      currency: 'EUR',
      scannedAt: DateTime.now(),
    } as any)

    const result = await repository.findLowestPrice(destination.id)

    assert.isObject(result)
    assert.equal(result?.id, lowestPrice.id)
    assert.equal(result?.price, 720)
  })

  test('devrait trouver le prix le plus haut', async ({ assert }) => {
    const repository = new PriceHistoryRepository()

    await PriceHistory.create({
      destinationId: destination.id,
      price: 850,
      currency: 'EUR',
      scannedAt: DateTime.now().minus({ days: 2 }),
    } as any)

    const highestPrice = await PriceHistory.create({
      destinationId: destination.id,
      price: 1200,
      currency: 'EUR',
      scannedAt: DateTime.now().minus({ days: 1 }),
    } as any)

    await PriceHistory.create({
      destinationId: destination.id,
      price: 950,
      currency: 'EUR',
      scannedAt: DateTime.now(),
    } as any)

    const result = await repository.findHighestPrice(destination.id)

    assert.isObject(result)
    assert.equal(result?.id, highestPrice.id)
    assert.equal(result?.price, 1200)
  })

  test('devrait calculer les statistiques', async ({ assert }) => {
    const repository = new PriceHistoryRepository()

    await PriceHistory.create({
      destinationId: destination.id,
      price: 700,
      currency: 'EUR',
      scannedAt: DateTime.now().minus({ days: 3 }),
    } as any)

    await PriceHistory.create({
      destinationId: destination.id,
      price: 900,
      currency: 'EUR',
      scannedAt: DateTime.now().minus({ days: 2 }),
    } as any)

    await PriceHistory.create({
      destinationId: destination.id,
      price: 1000,
      currency: 'EUR',
      scannedAt: DateTime.now().minus({ days: 1 }),
    } as any)

    const stats = await repository.getStatistics(destination.id)

    assert.isObject(stats)
    assert.equal(stats.min, 700)
    assert.equal(stats.max, 1000)
    assert.approximately(stats.avg, 866.67, 0.1)
    assert.equal(stats.count, 3)
  })

  test('devrait filtrer par période', async ({ assert }) => {
    const repository = new PriceHistoryRepository()

    const startDate = DateTime.now().minus({ days: 10 })
    const endDate = DateTime.now().minus({ days: 5 })

    await PriceHistory.create({
      destinationId: destination.id,
      price: 700,
      currency: 'EUR',
      scannedAt: DateTime.now().minus({ days: 15 }),
    } as any)

    await PriceHistory.create({
      destinationId: destination.id,
      price: 850,
      currency: 'EUR',
      scannedAt: DateTime.now().minus({ days: 7 }),
    } as any)

    await PriceHistory.create({
      destinationId: destination.id,
      price: 900,
      currency: 'EUR',
      scannedAt: DateTime.now().minus({ days: 2 }),
    } as any)

    const result = await repository.findByDateRange(destination.id, startDate, endDate)

    assert.isArray(result)
    assert.lengthOf(result, 1)
    assert.equal(result[0].price, 850)
  })

  test('devrait calculer le prix moyen', async ({ assert }) => {
    const repository = new PriceHistoryRepository()

    await PriceHistory.create({
      destinationId: destination.id,
      price: 800,
      currency: 'EUR',
      scannedAt: DateTime.now().minus({ days: 3 }),
    } as any)

    await PriceHistory.create({
      destinationId: destination.id,
      price: 900,
      currency: 'EUR',
      scannedAt: DateTime.now().minus({ days: 2 }),
    } as any)

    await PriceHistory.create({
      destinationId: destination.id,
      price: 1000,
      currency: 'EUR',
      scannedAt: DateTime.now().minus({ days: 1 }),
    } as any)

    const avgPrice = await repository.getAveragePrice(destination.id)

    assert.approximately(avgPrice, 900, 0.1)
  })

  test('devrait trouver les dernières entrées', async ({ assert }) => {
    const repository = new PriceHistoryRepository()

    const oldest = await PriceHistory.create({
      destinationId: destination.id,
      price: 800,
      currency: 'EUR',
      scannedAt: DateTime.now().minus({ days: 10 }),
    } as any)

    const middle = await PriceHistory.create({
      destinationId: destination.id,
      price: 850,
      currency: 'EUR',
      scannedAt: DateTime.now().minus({ days: 5 }),
    } as any)

    const newest = await PriceHistory.create({
      destinationId: destination.id,
      price: 900,
      currency: 'EUR',
      scannedAt: DateTime.now(),
    } as any)

    const result = await repository.findLatestByDestinationId(destination.id, 2)

    assert.isArray(result)
    assert.lengthOf(result, 2)
    assert.equal(result[0].id, newest.id)
    assert.equal(result[1].id, middle.id)
  })

  test('devrait compter les entrées', async ({ assert }) => {
    const repository = new PriceHistoryRepository()

    await PriceHistory.create({
      destinationId: destination.id,
      price: 800,
      currency: 'EUR',
      scannedAt: DateTime.now().minus({ days: 3 }),
    } as any)

    await PriceHistory.create({
      destinationId: destination.id,
      price: 900,
      currency: 'EUR',
      scannedAt: DateTime.now().minus({ days: 2 }),
    } as any)

    const count = await repository.countByDestinationId(destination.id)

    assert.equal(count, 2)
  })
})
