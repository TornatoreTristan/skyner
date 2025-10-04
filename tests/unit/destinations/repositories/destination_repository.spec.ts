import { test } from '@japa/runner'
import DestinationRepository from '#destinations/repositories/destination_repository'
import Destination from '#destinations/models/destination'
import User from '#users/models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'

test.group('DestinationRepository', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  let user: User

  group.each.setup(async () => {
    user = await User.create({
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User',
    })
  })

  test('devrait créer une nouvelle destination', async ({ assert }) => {
    const repository = new DestinationRepository()
    const destinationData = {
      userId: user.id,
      origin: 'CDG',
      destination: 'NRT',
      departureDate: DateTime.now().plus({ days: 30 }),
      returnDate: DateTime.now().plus({ days: 37 }),
      flexibility: 3,
      maxBudget: 1000,
      currency: 'EUR',
      adults: 2,
      children: 1,
      preferences: {
        airlines: ['AF', 'JL'],
        maxStops: 1,
        cabinClass: 'economy' as const,
      },
    }

    const result = await repository.create(destinationData as any)

    assert.isObject(result)
    assert.equal(result.userId, destinationData.userId)
    assert.equal(result.origin, destinationData.origin)
    assert.equal(result.destination, destinationData.destination)
    assert.equal(result.adults, destinationData.adults)
    assert.equal(result.children, destinationData.children)
    assert.deepEqual(result.preferences, destinationData.preferences)
  })

  test('devrait trouver une destination par ID', async ({ assert }) => {
    const repository = new DestinationRepository()
    const destination = await Destination.create({
      userId: user.id,
      origin: 'CDG',
      destination: 'NRT',
      departureDate: DateTime.now().plus({ days: 30 }),
      adults: 1,
      children: 0,
      currency: 'EUR',
    } as any)

    const result = await repository.findById(destination.id)

    assert.isObject(result)
    assert.equal(result?.id, destination.id)
    assert.equal(result?.origin, 'CDG')
    assert.equal(result?.destination, 'NRT')
  })

  test('devrait retourner null pour une destination inexistante', async ({ assert }) => {
    const repository = new DestinationRepository()
    const result = await repository.findById(99999)

    assert.isNull(result)
  })

  test('devrait trouver toutes les destinations d\'un utilisateur', async ({ assert }) => {
    const repository = new DestinationRepository()

    await Destination.create({
      userId: user.id,
      origin: 'CDG',
      destination: 'NRT',
      departureDate: DateTime.now().plus({ days: 30 }),
      adults: 1,
      children: 0,
      currency: 'EUR',
    } as any)

    await Destination.create({
      userId: user.id,
      origin: 'ORY',
      destination: 'HND',
      departureDate: DateTime.now().plus({ days: 60 }),
      adults: 2,
      children: 0,
      currency: 'EUR',
    } as any)

    const otherUser = await User.create({
      email: 'other@example.com',
      password: 'password',
    })

    await Destination.create({
      userId: otherUser.id,
      origin: 'LHR',
      destination: 'JFK',
      departureDate: DateTime.now().plus({ days: 45 }),
      adults: 1,
      children: 0,
      currency: 'EUR',
    } as any)

    const result = await repository.findByUserId(user.id)

    assert.isArray(result)
    assert.lengthOf(result, 2)
    assert.isTrue(result.every((d) => d.userId === user.id))
  })

  test('devrait trouver les destinations actives d\'un utilisateur', async ({ assert }) => {
    const repository = new DestinationRepository()

    await Destination.create({
      userId: user.id,
      origin: 'CDG',
      destination: 'NRT',
      departureDate: DateTime.now().plus({ days: 30 }),
      adults: 1,
      children: 0,
      currency: 'EUR',
    } as any)

    await Destination.create({
      userId: user.id,
      origin: 'ORY',
      destination: 'HND',
      departureDate: DateTime.now().plus({ days: 60 }),
      adults: 1,
      children: 0,
      currency: 'EUR',
      deletedAt: DateTime.now(),
    } as any)

    const result = await repository.findActiveByUserId(user.id)

    assert.isArray(result)
    assert.lengthOf(result, 1)
    assert.equal(result[0].origin, 'CDG')
  })

  test('devrait compter les destinations d\'un utilisateur', async ({ assert }) => {
    const repository = new DestinationRepository()

    await Destination.create({
      userId: user.id,
      origin: 'CDG',
      destination: 'NRT',
      departureDate: DateTime.now().plus({ days: 30 }),
      adults: 1,
      children: 0,
      currency: 'EUR',
    } as any)

    await Destination.create({
      userId: user.id,
      origin: 'ORY',
      destination: 'HND',
      departureDate: DateTime.now().plus({ days: 60 }),
      adults: 1,
      children: 0,
      currency: 'EUR',
    } as any)

    const count = await repository.countByUserId(user.id)

    assert.equal(count, 2)
  })

  test('devrait trouver des destinations par route', async ({ assert }) => {
    const repository = new DestinationRepository()

    await Destination.create({
      userId: user.id,
      origin: 'CDG',
      destination: 'NRT',
      departureDate: DateTime.now().plus({ days: 30 }),
      adults: 1,
      children: 0,
      currency: 'EUR',
    } as any)

    await Destination.create({
      userId: user.id,
      origin: 'CDG',
      destination: 'HND',
      departureDate: DateTime.now().plus({ days: 60 }),
      adults: 1,
      children: 0,
      currency: 'EUR',
    } as any)

    const result = await repository.findByRoute('CDG', 'NRT')

    assert.isArray(result)
    assert.lengthOf(result, 1)
    assert.equal(result[0].origin, 'CDG')
    assert.equal(result[0].destination, 'NRT')
  })

  test('devrait soft delete une destination', async ({ assert }) => {
    const repository = new DestinationRepository()
    const destination = await Destination.create({
      userId: user.id,
      origin: 'CDG',
      destination: 'NRT',
      departureDate: DateTime.now().plus({ days: 30 }),
      adults: 1,
      children: 0,
      currency: 'EUR',
    } as any)

    await repository.delete(destination.id, { soft: true })

    const deleted = await Destination.find(destination.id)
    assert.isNotNull(deleted?.deletedAt)
  })

  test('devrait restore une destination soft deleted', async ({ assert }) => {
    const repository = new DestinationRepository()
    const destination = await Destination.create({
      userId: user.id,
      origin: 'CDG',
      destination: 'NRT',
      departureDate: DateTime.now().plus({ days: 30 }),
      adults: 1,
      children: 0,
      currency: 'EUR',
      deletedAt: DateTime.now(),
    } as any)

    assert.isNotNull(destination.deletedAt)

    const restored = await repository.restore(destination.id)

    assert.isTrue(restored.deletedAt === null || restored.deletedAt === undefined)
  })

  test('devrait mettre à jour une destination', async ({ assert }) => {
    const repository = new DestinationRepository()
    const destination = await Destination.create({
      userId: user.id,
      origin: 'CDG',
      destination: 'NRT',
      departureDate: DateTime.now().plus({ days: 30 }),
      adults: 1,
      children: 0,
      currency: 'EUR',
    } as any)

    const updated = await repository.update(destination.id, {
      adults: 2,
      children: 1,
      maxBudget: 1500,
    } as any)

    assert.equal(updated.adults, 2)
    assert.equal(updated.children, 1)
    assert.equal(updated.maxBudget, 1500)
  })
})
