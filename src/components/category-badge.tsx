import type { Category } from '@/lib/categories'
import { CATEGORY_LABEL } from '@/lib/categories'

const styles: Record<Category, string> = {
  sales: 'bg-[#6A8FB3] text-white',
  after_sales: 'bg-[#C9A27E] text-white',
}

export function CategoryBadge({ category }: { category: Category }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${styles[category]}`}>
      {CATEGORY_LABEL[category]}
    </span>
  )
}