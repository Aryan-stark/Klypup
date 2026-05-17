/** Mirrors backend schemas/common.py */

export interface ApiResponse<T> {
  data: T
  message: string
}

export interface PaginationMeta {
  page: number
  per_page: number
  total: number
  total_pages: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
}
