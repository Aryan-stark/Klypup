/**
 * ProductDetail.tsx — Single product view.
 * Shows: product info, margin, stock, price change history chart, latest recommendation.
 * TODO: implement using useProduct(id) and useProductHistory(id)
 */
import { useParams } from 'react-router-dom'

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Product Detail</h1>
      <p className="text-muted-foreground">TODO: product {id} detail view</p>
    </div>
  )
}
