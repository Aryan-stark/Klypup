import api from '@/lib/api'
import type { ApiResponse } from '@/types/api'
import type {
  OrgUser,
  InviteUserRequest,
  UpdateUserRequest,
  CreateInviteRequest,
  Invitation,
  AcceptInviteRequest,
} from '@/types/user'

export const userService = {
  async list(): Promise<ApiResponse<OrgUser[]>> {
    const res = await api.get('/users')
    return res.data
  },

  async invite(data: InviteUserRequest): Promise<ApiResponse<OrgUser>> {
    const res = await api.post('/users/invite', data)
    return res.data
  },

  async update(id: string, data: UpdateUserRequest): Promise<ApiResponse<OrgUser>> {
    const res = await api.patch(`/users/${id}`, data)
    return res.data
  },

  // ── Invitation flow ──────────────────────────────────────────────────────────

  /** Admin: create a single-use invite token for an email + role. */
  async createInvite(data: CreateInviteRequest): Promise<ApiResponse<Invitation>> {
    const res = await api.post('/users/invitations', data)
    return res.data
  },

  /** Public: load invite metadata so the /join page can show org name etc. */
  async getInvite(token: string): Promise<ApiResponse<Invitation>> {
    const res = await api.get(`/users/invitations/${token}`)
    return res.data
  },

  /** Public: submit name + password to complete registration. Returns JWT tokens. */
  async acceptInvite(token: string, data: AcceptInviteRequest): Promise<ApiResponse<{
    access_token: string
    refresh_token: string
    token_type: string
    user: { id: string; org_id: string; email: string; full_name: string; role: string }
  }>> {
    const res = await api.post(`/users/invitations/${token}/accept`, data)
    return res.data
  },
}
