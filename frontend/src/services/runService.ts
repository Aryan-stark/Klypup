import api from '@/lib/api'
import type { ApiResponse } from '@/types/api'

export const runService = {
  async trigger(productFilter?: Record<string, unknown>): Promise<ApiResponse<{ id: string; total_products: number }>> {
    const res = await api.post('/runs', { product_filter: productFilter ?? null })
    return res.data
  },

  async list(): Promise<ApiResponse<unknown[]>> {
    const res = await api.get('/runs')
    return res.data
  },

  async get(id: string): Promise<ApiResponse<unknown>> {
    const res = await api.get(`/runs/${id}`)
    return res.data
  },

  /** Returns an EventSource for SSE live progress. */
  streamProgress(runId: string): EventSource {
    const token = localStorage.getItem('klypup-auth')
      ? JSON.parse(localStorage.getItem('klypup-auth')!).state?.accessToken
      : ''
    return new EventSource(
      `${import.meta.env.VITE_API_URL}/runs/${runId}/stream?token=${token}`
    )
  },
}
