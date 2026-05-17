import { useState } from 'react'
import { useProducts } from '@/hooks/useProducts'
import ProductFilters from '@/components/products/ProductFilters'
import ProductTable from '@/components/products/ProductTable'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import ErrorState from '@/components/common/ErrorState'
import type { ProductFilters as Filters } from '@/types/product'

export default function Products() {
  const [filters, setFilters] = useState<Filters>({
    sort_by: 'name',
    sort_order: 'asc',
    page: 1,
    per_page: 50,
  })

  const { data, isLoading, isError, refetch } = useProducts(filters)

  const products = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Product Catalog</h1>

      <ProductFilters filters={filters} onChange={setFilters} />

      {isLoading && <LoadingSpinner />}
      {isError && <ErrorState retry={() => refetch()} />}

      {!isLoading && !isError && (
        <>
          <ProductTable products={products} />
          {meta && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{meta.total} products</span>
              <div className="flex gap-2">
                <button
                  disabled={filters.page === 1}
                  onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
                  className="px-3 py-1 rounded border disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="px-3 py-1">
                  {filters.page} / {meta.total_pages}
                </span>
                <button
                  disabled={filters.page === meta.total_pages}
                  onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
                  className="px-3 py-1 rounded border disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
