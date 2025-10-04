import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#users/models/user'
import Destination from '#destinations/models/destination'
import { DateTime } from 'luxon'

test.group('DestinationsController', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  let user: User

  group.each.setup(async () => {
    user = await User.create({
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User',
    })
  })

  test('GET /api/destinations - should list user destinations', async ({ client }) => {
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

    const response = await client.get('/api/destinations').withSession({ user_id: user.id })

    response.assertStatus(200)

    const body = response.body()
    if (!body.destinations || body.destinations.length !== 2) {
      throw new Error(`Expected 2 destinations, got ${body.destinations?.length || 0}`)
    }
  })

  test('POST /api/destinations - should create a new destination', async ({ client }) => {
    const destinationData = {
      origin: 'CDG',
      destination: 'NRT',
      departureDate: DateTime.now().plus({ days: 30 }).toFormat('yyyy-MM-dd'),
      returnDate: DateTime.now().plus({ days: 37 }).toFormat('yyyy-MM-dd'),
      adults: 2,
      children: 1,
      currency: 'EUR',
      maxBudget: 1500,
      flexibility: 3,
    }

    const response = await client.post('/api/destinations').json(destinationData).withSession({ user_id: user.id })

    response.assertStatus(201)
    response.assertBodyContains({
      destination: {
        origin: 'CDG',
        destination: 'NRT',
        adults: 2,
        children: 1,
      },
    })
  })

  test('POST /api/destinations - should reject invalid airport code', async ({ client }) => {
    const destinationData = {
      origin: 'CDGX',
      destination: 'NRT',
      departureDate: DateTime.now().plus({ days: 30 }).toFormat('yyyy-MM-dd'),
      adults: 1,
      children: 0,
    }

    const response = await client.post('/api/destinations').json(destinationData).withSession({ user_id: user.id })

    response.assertStatus(422)
  })

  test('GET /api/destinations/:id - should show destination details', async ({ client }) => {
    const destination = await Destination.create({
      userId: user.id,
      origin: 'CDG',
      destination: 'NRT',
      departureDate: DateTime.now().plus({ days: 30 }),
      adults: 1,
      children: 0,
      currency: 'EUR',
    } as any)

    const response = await client.get(`/api/destinations/${destination.id}`).withSession({ user_id: user.id })

    response.assertStatus(200)
    response.assertBodyContains({
      destination: {
        id: destination.id,
        origin: 'CDG',
        destination: 'NRT',
      },
    })
  })

  test('GET /api/destinations/:id - should deny access to other user destination', async ({
    client,
  }) => {
    const otherUser = await User.create({
      email: 'other@example.com',
      password: 'password',
    })

    const destination = await Destination.create({
      userId: otherUser.id,
      origin: 'CDG',
      destination: 'NRT',
      departureDate: DateTime.now().plus({ days: 30 }),
      adults: 1,
      children: 0,
      currency: 'EUR',
    } as any)

    const response = await client.get(`/api/destinations/${destination.id}`).withSession({ user_id: user.id })

    response.assertStatus(403)
  })

  test('PUT /api/destinations/:id - should update a destination', async ({ client }) => {
    const destination = await Destination.create({
      userId: user.id,
      origin: 'CDG',
      destination: 'NRT',
      departureDate: DateTime.now().plus({ days: 30 }),
      adults: 1,
      children: 0,
      currency: 'EUR',
    } as any)

    const updateData = {
      adults: 2,
      children: 1,
      maxBudget: 2000,
    }

    const response = await client.put(`/api/destinations/${destination.id}`).json(updateData).withSession({ user_id: user.id })

    response.assertStatus(200)
    response.assertBodyContains({
      destination: {
        adults: 2,
        children: 1,
        maxBudget: 2000,
      },
    })
  })

  test('DELETE /api/destinations/:id - should delete a destination', async ({ client }) => {
    const destination = await Destination.create({
      userId: user.id,
      origin: 'CDG',
      destination: 'NRT',
      departureDate: DateTime.now().plus({ days: 30 }),
      adults: 1,
      children: 0,
      currency: 'EUR',
    } as any)

    const response = await client.delete(`/api/destinations/${destination.id}`).withSession({ user_id: user.id })

    response.assertStatus(200)

    const deleted = await Destination.find(destination.id)
    if (!deleted?.deletedAt) {
      throw new Error('Destination should be soft deleted')
    }
  })

  test('DELETE /api/destinations/:id - should deny deletion of other user destination', async ({
    client,
  }) => {
    const otherUser = await User.create({
      email: 'other@example.com',
      password: 'password',
    })

    const destination = await Destination.create({
      userId: otherUser.id,
      origin: 'CDG',
      destination: 'NRT',
      departureDate: DateTime.now().plus({ days: 30 }),
      adults: 1,
      children: 0,
      currency: 'EUR',
    } as any)

    const response = await client.delete(`/api/destinations/${destination.id}`).withSession({ user_id: user.id })

    response.assertStatus(403)
  })

  test('should require authentication', async ({ client }) => {
    const response = await client.get('/api/destinations')

    response.assertStatus(401)
  })
})
