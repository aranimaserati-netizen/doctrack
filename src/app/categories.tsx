export type Category = 'sales' | 'after_sales'

export const CATEGORY_LABEL: Record<Category, string> = {
  sales: 'Sales',
  after_sales: 'After Sales',
}

export const categoryToSlug = (c: Category) => (c === 'sales' ? 'sales' : 'after-sales')
export const slugToCategory = (s?: string): Category => (s === 'after-sales' ? 'after_sales' : 'sales')