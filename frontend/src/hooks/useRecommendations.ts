import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { recommendationService } from '@/services/recommendationService'

export function useRecommendations(params: Record<string, unknown>) {
  return useQuery({
    queryKey: ['recommendations', params],
    queryFn: () => recommendationService.list(params),
  })
}

export function useRecommendation(id: string) {
  return useQuery({
    queryKey: ['recommendation', id],
    queryFn: () => recommendationService.get(id),
    enabled: !!id,
  })
}

export function useApprove() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      recommendationService.approve(id, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recommendations'] })
      // Price was written to the DB — refresh product catalog and any open product detail
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['product'] })
    },
  })
}

export function useReject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason, note }: { id: string; reason: string; note?: string }) =>
      recommendationService.reject(id, reason, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recommendations'] })
      // No price change on reject, but product-history or detail pages may want to refresh
      qc.invalidateQueries({ queryKey: ['product'] })
    },
  })
}

export function useModify() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, override_price, note }: { id: string; override_price: number; note?: string }) =>
      recommendationService.modify(id, override_price, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recommendations'] })
      // Override price was applied — refresh catalog and product detail
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['product'] })
    },
  })
}
