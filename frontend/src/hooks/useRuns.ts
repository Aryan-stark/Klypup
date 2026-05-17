import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { runService } from '@/services/runService'

export function useRuns() {
  return useQuery({
    queryKey: ['runs'],
    queryFn: () => runService.list(),
  })
}

export function useRun(id: string) {
  return useQuery({
    queryKey: ['run', id],
    queryFn: () => runService.get(id),
    enabled: !!id,
  })
}

export function useTriggerRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (productFilter?: Record<string, unknown>) =>
      runService.trigger(productFilter),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['runs'] })
      qc.invalidateQueries({ queryKey: ['recommendations'] })
    },
  })
}
