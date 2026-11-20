import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireProfile, signOut } from '@/lib/auth'
import { Button } from '@/components/ui/button'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireProfile()
  if (profile.role !== 'customer') redirect('/business')
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <nav className="flex items-center gap-6">
          <span className="font-semibold">DocFlow · Customer Portal</span>
          <Link href="/portal" className="text-sm hover:underline">Documents</Link>
          <Link href="/portal/settings" className="text-sm hover:underline">Settings</Link>
        </nav>
        <form action={signOut} className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{profile.email}</span>
          <Button variant="outline" size="sm" type="submit">Sign out</Button>
        </form>
      </header>
      <main className="mx-auto max-w-7xl p-6">{children}</main>
    </div>
  )
}