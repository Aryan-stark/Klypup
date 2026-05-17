import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '@/services/dashboardService'

export function useDashboardKpis() {
  return useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: () => dashboardService.getKpis(),
    refetchInterval: 60_000,    // refresh KPIs every 60 seconds
  })
}

export function useDashboardActivity() {
  return useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: () => dashboardService.getActivity(),
  })
}
