/** Mirrors backend schemas/product.py */

export interface Product {
  id: string
  org_id: string
  sku: string
  name: string
  category: string
  brand: string
  current_price: number
  cost_basis: number
  margin_pct: number                        // computed by backend
  stock_quantity: number
  inventory_status: 'ok' | 'low' | 'critical' | 'out_of_stock' | 'overstock'
  is_active: boolean
  latest_recommendation_status: string | null
}

export interface ProductFilters {
  category?: string
  search?: string
  sort_by?: 'name' | 'price' | 'margin' | 'stock'
  sort_order?: 'asc' | 'desc'
  page?: number
  per_page?: number
}
