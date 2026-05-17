import { useQuery } from '@tanstack/react-query'
import { productService } from '@/services/productService'
import type { ProductFilters } from '@/types/product'

export function useProducts(filters: ProductFilters) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: () => productService.list(filters),
  })
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => productService.get(id),
    enabled: !!id,
  })
}

export function useProductHistory(id: string) {
  return useQuery({
    queryKey: ['product-history', id],
    queryFn: () => productService.getHistory(id),
    enabled: !!id,
  })
}
