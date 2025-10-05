import type { User } from './user.ts'

export interface LoginData {
  email: string
  password: string
  remember: boolean
}

export interface LoginResult {
  success: boolean
  user: User | null
  error?: string
}

export interface RegisterData {
  fullName?: string
  email: string
  password: string
  passwordConfirmation: string
}
