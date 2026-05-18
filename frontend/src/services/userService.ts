import api from '@/lib/api'
import type { ApiResponse } from '@/types/api'
import type { OrgUser, InviteUserRequest, UpdateUserRequest } from '@/types/user'

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
}
