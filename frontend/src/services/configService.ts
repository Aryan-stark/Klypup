import api from '@/lib/api'
import type { OrgConfig, AIConfig, AIConfigUpdate, AIVerifyRequest, AIVerifyResult } from '@/types/config'
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

  async getAI(): Promise<ApiResponse<AIConfig>> {
    const res = await api.get('/config/ai')
    return res.data
  },

  async updateAI(data: AIConfigUpdate): Promise<ApiResponse<AIConfig>> {
    const res = await api.put('/config/ai', data)
    return res.data
  },

  async verifyAI(data: AIVerifyRequest): Promise<ApiResponse<AIVerifyResult>> {
    const res = await api.post('/config/ai/verify', data)
    return res.data
  },
}
