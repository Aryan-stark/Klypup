import api from '@/lib/api'
import type { AuditLog } from '@/types/audit'
import type { PaginatedResponse } from '@/types/api'

export const auditService = {
  async list(params: Record<string, unknown>): Promise<PaginatedResponse<AuditLog>> {
    const res = await api.get('/audit', { params })
    return res.data
  },
}
