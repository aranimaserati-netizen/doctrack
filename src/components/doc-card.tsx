import Link from 'next/link'
import { CategoryBadge } from '@/components/category-badge'
import { StatusBadge } from '@/components/status-badge'
import type { Category } from '@/lib/categories'

const card: Record<Category, string> = {
  sales: 'border-[#BFD3E0] border-l-[#6A8FB3] bg-[#EAF1F6]',
  after_sales: 'border-[#E8D9C3] border-l-[#C9A27E] bg-[#F8F1E7]',
}

export function DocCard(p: { href: string; title: string; category: Category; status: string; date: string }) {
  return (
    <Link
      href={p.href}
      className={`flex items-center justify-between gap-4 rounded-lg border border-l-4 p-4 shadow-sm transition hover:shadow-md ${card[p.category]}`}
    >
      <div className="space-y-1">
        <CategoryBadge category={p.category} />
        <p className="text-lg font-semibold text-[#2F3556]">{p.title}</p>
        <p className="text-xs text-[#2F3556]/60">{new Date(p.date).toLocaleDateString()}</p>
      </div>
      <StatusBadge status={p.status} />
    </Link>
  )
}