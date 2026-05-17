import api from '@/lib/api'
import type { ApiResponse } from '@/types/api'

export const dashboardService = {
  async getKpis(): Promise<ApiResponse<unknown>> {
    const res = await api.get('/dashboard/kpis')
    return res.data
  },

  async getActivity(): Promise<ApiResponse<unknown[]>> {
    const res = await api.get('/dashboard/activity')
    return res.data
  },
}
