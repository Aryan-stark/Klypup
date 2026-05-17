/** Mirrors backend schemas/auth.py */

export type UserRole = 'admin' | 'pricing_analyst'

export interface User {
  id: string
  org_id: string
  email: string
  full_name: string
  role: UserRole
}

export interface LoginRequest {
  email: string
  password: string
}

export interface SignupRequest {
  full_name: string
  email: string
  password: string
  org_name: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}
