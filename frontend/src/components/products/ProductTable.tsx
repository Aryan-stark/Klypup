import { useNavigate } from 'react-router-dom'
import { formatCurrency, formatPercent } from '@/lib/utils'
import type { Product } from '@/types/product'

const STATUS_BADGE: Record<string, string> = {
  ok:           'bg-green-100 text-green-800',
  low:          'bg-yellow-100 text-yellow-800',
  critical:     'bg-red-100 text-red-800',
  out_of_stock: 'bg-gray-100 text-gray-600',
  overstock:    'bg-blue-100 text-blue-800',
}

const REC_BADGE: Record<string, string> = {
  pending:       'bg-yellow-100 text-yellow-800',
  escalated:     'bg-orange-100 text-orange-800',
  applied:       'bg-green-100 text-green-800',
  auto_approved: 'bg-blue-100 text-blue-800',
  rejected:      'bg-red-100 text-red-800',
}

export default function ProductTable({ products }: { products: Product[] }) {
  const navigate = useNavigate()

  if (!products.length) {
    return <p className="py-12 text-center text-sm text-muted-foreground">No products found.</p>
  }

  return (
    <div className="glass-card rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left">SKU</th>
            <th className="px-4 py-3 text-left">Name</th>
            <th className="px-4 py-3 text-left">Category</th>
            <th className="px-4 py-3 text-right">Price</th>
            <th className="px-4 py-3 text-right">Margin</th>
            <th className="px-4 py-3 text-right">Stock</th>
            <th className="px-4 py-3 text-center">Inventory</th>
            <th className="px-4 py-3 text-center">Last Rec</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {products.map((p) => (
            <tr
              key={p.id}
              className="hover:bg-muted/30 cursor-pointer transition-colors"
              onClick={() => navigate(`/products/${p.id}`)}
            >
              <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
              <td className="px-4 py-3 font-medium">{p.name}</td>
              <td className="px-4 py-3 text-muted-foreground capitalize">{p.category.replace('_', ' ')}</td>
              <td className="px-4 py-3 text-right">{formatCurrency(p.current_price)}</td>
              <td className="px-4 py-3 text-right">{formatPercent(p.margin_pct)}</td>
              <td className="px-4 py-3 text-right">{p.stock_quantity}</td>
              <td className="px-4 py-3 text-center">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[p.inventory_status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {p.inventory_status.replace('_', ' ')}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                {p.latest_recommendation_status ? (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${REC_BADGE[p.latest_recommendation_status] ?? 'bg-gray-100'}`}>
                    {p.latest_recommendation_status.replace('_', ' ')}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
