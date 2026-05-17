import api from '@/lib/api'
import type { OrgConfig } from '@/types/config'
import type { ApiResponse } from '@/types/api'

export const configService = {
  async get(): Promise<ApiResponse<OrgConfig>> {
    const res = await api.get('/config')
    return res.data
  },

  async update(data: Partial<OrgConfig>): Promise<ApiResponse<OrgConfig>> {
    const res = await api.put('/config', data)
    return res.data
  },

  async reset(): Promise<ApiResponse<OrgConfig>> {
    const res = await api.post('/config/reset')
    return res.data
  },
}
