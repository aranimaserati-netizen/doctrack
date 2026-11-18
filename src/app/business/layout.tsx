import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireProfile, signOut } from '@/lib/auth'
import { Button, buttonVariants } from '@/components/ui/button'

export default async function BusinessLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireProfile()
  if (profile.role !== 'business') redirect('/portal')
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <nav className="flex items-center gap-6">
          <span className="font-semibold">DocFlow</span>
          <Link href="/business" className="text-sm hover:underline">Documents</Link>
          <Link href="/business/customers" className="text-sm hover:underline">Customers</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/business/documents/new" className={buttonVariants({ size: 'sm' })}>
            Upload document
          </Link>
          <form action={signOut} className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{profile.email}</span>
            <Button variant="outline" size="sm" type="submit">Sign out</Button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-6">{children}</main>
    </div>
  )
}