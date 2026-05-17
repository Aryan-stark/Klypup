import api from '@/lib/api'
import type { Recommendation, RecommendationDetail } from '@/types/recommendation'
import type { ApiResponse, PaginatedResponse } from '@/types/api'

export const recommendationService = {
  async list(params: Record<string, unknown>): Promise<PaginatedResponse<Recommendation>> {
    const res = await api.get('/recommendations', { params })
    return res.data
  },

  async get(id: string): Promise<ApiResponse<RecommendationDetail>> {
    const res = await api.get(`/recommendations/${id}`)
    return res.data
  },

  async approve(id: string, note = ''): Promise<ApiResponse<Recommendation>> {
    const res = await api.post(`/recommendations/${id}/approve`, { note })
    return res.data
  },

  async reject(id: string, reason: string, note = ''): Promise<ApiResponse<Recommendation>> {
    const res = await api.post(`/recommendations/${id}/reject`, { reason, note })
    return res.data
  },

  async modify(id: string, override_price: number, note = ''): Promise<ApiResponse<Recommendation>> {
    const res = await api.post(`/recommendations/${id}/modify`, { override_price, note })
    return res.data
  },
}
