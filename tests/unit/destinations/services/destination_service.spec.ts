import { test } from '@japa/runner'
import DestinationService from '#destinations/services/destination_service'
import DestinationRepository from '#destinations/repositories/destination_repository'
import User from '#users/models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'

test.group('DestinationService', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  let user: User
  let service: DestinationService
  let repository: DestinationRepository

  group.each.setup(async () => {
    user = await User.create({
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User',
    })

    repository = new DestinationRepository()
    service = new DestinationService(repository)
  })

  test('devrait créer une destination valide', async ({ assert }) => {
    const destinationData = {
      userId: user.id,
      origin: 'CDG',
      destination: 'NRT',
      departureDate: DateTime.now().plus({ days: 30 }).toFormat('yyyy-MM-dd'),
      returnDate: DateTime.now().plus({ days: 37 }).toFormat('yyyy-MM-dd'),
      flexibility: 3,
      maxBudget: 1500,
      currency: 'EUR',
      adults: 2,
      children: 1,
    }

    const result = await service.create(destinationData as any)

    assert.isObject(result)
    assert.equal(result.userId, user.id)
    assert.equal(result.origin, 'CDG')
    assert.equal(result.destination, 'NRT')
    assert.equal(result.adults, 2)
    assert.equal(result.children, 1)
  })

  test('devrait rejeter un code aéroport invalide', async ({ assert }) => {
    const destinationData = {
      userId: user.id,
      origin: 'CDGX',
      destination: 'NRT',
      departureDate: DateTime.now().plus({ days: 30 }).toFormat('yyyy-MM-dd'),
      adults: 1,
      children: 0,
    }

    await assert.rejects(async () => {
      await service.create(destinationData as any)
    })
  })

  test('devrait rejeter une date de départ passée', async ({ assert }) => {
    const destinationData = {
      userId: user.id,
      origin: 'CDG',
      destination: 'NRT',
      departureDate: DateTime.now().minus({ days: 1 }).toFormat('yyyy-MM-dd'),
      adults: 1,
      children: 0,
    }

    await assert.rejects(async () => {
      await service.create(destinationData as any)
    })
  })

  test('devrait récupérer les destinations d\'un utilisateur', async ({ assert }) => {
    await service.create({
      userId: user.id,
      origin: 'CDG',
      destination: 'NRT',
      departureDate: DateTime.now().plus({ days: 30 }).toFormat('yyyy-MM-dd'),
      adults: 1,
      children: 0,
    } as any)

    await service.create({
      userId: user.id,
      origin: 'ORY',
      destination: 'HND',
      departureDate: DateTime.now().plus({ days: 60 }).toFormat('yyyy-MM-dd'),
      adults: 2,
      children: 0,
    } as any)

    const destinations = await service.getUserDestinations(user.id)

    assert.isArray(destinations)
    assert.lengthOf(destinations, 2)
  })

  test('devrait mettre à jour une destination', async ({ assert }) => {
    const destination = await service.create({
      userId: user.id,
      origin: 'CDG',
      destination: 'NRT',
      departureDate: DateTime.now().plus({ days: 30 }).toFormat('yyyy-MM-dd'),
      adults: 1,
      children: 0,
    } as any)

    const updated = await service.update(destination.id, {
      adults: 2,
      children: 1,
      maxBudget: 2000,
    } as any)

    assert.equal(updated.adults, 2)
    assert.equal(updated.children, 1)
    assert.equal(updated.maxBudget, 2000)
  })

  test('devrait supprimer une destination (soft delete)', async ({ assert }) => {
    const destination = await service.create({
      userId: user.id,
      origin: 'CDG',
      destination: 'NRT',
      departureDate: DateTime.now().plus({ days: 30 }).toFormat('yyyy-MM-dd'),
      adults: 1,
      children: 0,
    } as any)

    await service.delete(destination.id)

    const found = await repository.findById(destination.id)
    assert.isNotNull(found?.deletedAt)
  })

  test('devrait vérifier la propriété d\'une destination', async ({ assert }) => {
    const destination = await service.create({
      userId: user.id,
      origin: 'CDG',
      destination: 'NRT',
      departureDate: DateTime.now().plus({ days: 30 }).toFormat('yyyy-MM-dd'),
      adults: 1,
      children: 0,
    } as any)

    const isOwner = await service.verifyOwnership(destination.id, user.id)
    assert.isTrue(isOwner)

    const otherUser = await User.create({
      email: 'other@example.com',
      password: 'password',
    })

    const isNotOwner = await service.verifyOwnership(destination.id, otherUser.id)
    assert.isFalse(isNotOwner)
  })

  test('devrait compter les destinations d\'un utilisateur', async ({ assert }) => {
    await service.create({
      userId: user.id,
      origin: 'CDG',
      destination: 'NRT',
      departureDate: DateTime.now().plus({ days: 30 }).toFormat('yyyy-MM-dd'),
      adults: 1,
      children: 0,
    } as any)

    await service.create({
      userId: user.id,
      origin: 'ORY',
      destination: 'HND',
      departureDate: DateTime.now().plus({ days: 60 }).toFormat('yyyy-MM-dd'),
      adults: 1,
      children: 0,
    } as any)

    const count = await service.countUserDestinations(user.id)
    assert.equal(count, 2)
  })

  test('devrait rejeter un nombre de passagers trop élevé', async ({ assert }) => {
    const destinationData = {
      userId: user.id,
      origin: 'CDG',
      destination: 'NRT',
      departureDate: DateTime.now().plus({ days: 30 }).toFormat('yyyy-MM-dd'),
      adults: 9,
      children: 1,
    }

    await assert.rejects(async () => {
      await service.create(destinationData as any)
    })
  })

  test('devrait rejeter moins d\'un adulte', async ({ assert }) => {
    const destinationData = {
      userId: user.id,
      origin: 'CDG',
      destination: 'NRT',
      departureDate: DateTime.now().plus({ days: 30 }).toFormat('yyyy-MM-dd'),
      adults: 0,
      children: 2,
    }

    await assert.rejects(async () => {
      await service.create(destinationData as any)
    })
  })
})
