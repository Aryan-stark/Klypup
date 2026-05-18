/** Mirrors backend schemas/user.py */

export interface OrgUser {
  id: string
  org_id: string
  email: string
  full_name: string
  role: 'admin' | 'pricing_analyst'
  is_active: boolean
  created_at: string
  last_login_at: string | null
}

export interface InviteUserRequest {
  email: string
  full_name: string
  password: string
  role: 'admin' | 'pricing_analyst'
}

export interface UpdateUserRequest {
  role?: 'admin' | 'pricing_analyst'
  is_active?: boolean
  full_name?: string
}
