import api from '@/lib/api'
import type { Product, ProductFilters } from '@/types/product'
import type { ApiResponse, PaginatedResponse } from '@/types/api'

export const productService = {
  async list(filters: ProductFilters): Promise<PaginatedResponse<Product>> {
    const res = await api.get('/products', { params: filters })
    return res.data
  },

  async get(id: string): Promise<ApiResponse<Product>> {
    const res = await api.get(`/products/${id}`)
    return res.data
  },

  async getHistory(id: string): Promise<ApiResponse<unknown[]>> {
    const res = await api.get(`/products/${id}/history`)
    return res.data
  },
}
