import { CreateUserData, User } from '#shared/types/user'
import hash from '@adonisjs/core/services/hash'
import UserRepository from '#users/repositories/user_repository'

export default class UserService {
  static async create(userData: CreateUserData): Promise<User> {
    const hashedPassword = await hash.make(userData.password)

    const userRepository = new UserRepository()
    return await userRepository.save({
      email: userData.email,
      password: hashedPassword,
    })
  }
}
