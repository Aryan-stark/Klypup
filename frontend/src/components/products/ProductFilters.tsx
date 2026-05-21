import type { ProductFilters as Filters } from '@/types/product'

interface Props {
  filters: Filters
  onChange: (f: Filters) => void
}

const SORT_OPTIONS = [
  { value: 'name',   label: 'Name' },
  { value: 'price',  label: 'Price' },
  { value: 'margin', label: 'Margin' },
  { value: 'stock',  label: 'Stock' },
]

const CATEGORIES = [
  'Electronics',
  'Home & Garden',
  'Clothing',
  'Sports',
  'Beauty & Health',
  'Toys',
  'Books & Media',
  'Automotive',
]

export default function ProductFilters({ filters, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <input
        type="text"
        placeholder="Search by name or SKU…"
        className="rounded border px-3 py-2 text-sm bg-background w-56"
        value={filters.search ?? ''}
        onChange={(e) => onChange({ ...filters, search: e.target.value || undefined, page: 1 })}
      />

      <select
        className="rounded border px-3 py-2 text-sm bg-background"
        value={filters.category ?? ''}
        onChange={(e) => onChange({ ...filters, category: e.target.value || undefined, page: 1 })}
      >
        <option value="">All categories</option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <select
        className="rounded border px-3 py-2 text-sm bg-background"
        value={filters.sort_by ?? 'name'}
        onChange={(e) => onChange({ ...filters, sort_by: e.target.value as Filters['sort_by'] })}
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>Sort: {o.label}</option>
        ))}
      </select>

      <button
        className="rounded border px-3 py-2 text-sm"
        onClick={() => onChange({ ...filters, sort_order: filters.sort_order === 'asc' ? 'desc' : 'asc' })}
      >
        {filters.sort_order === 'desc' ? '↓ Desc' : '↑ Asc'}
      </button>
    </div>
  )
}
