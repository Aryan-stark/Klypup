import { useQuery } from '@tanstack/react-query'
import { auditService } from '@/services/auditService'

export function useAudit(params: Record<string, unknown>) {
  return useQuery({
    queryKey: ['audit', params],
    queryFn: () => auditService.list(params),
  })
}
