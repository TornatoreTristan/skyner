import type { User, CreateUserData } from './user.ts'

export interface UserRepositoryInterface {
  save(userData: CreateUserData): Promise<User>
  findByEmail(email: string): Promise<User | null>
  findById(id: string): Promise<User | null>
}
