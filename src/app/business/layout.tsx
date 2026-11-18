import { redirect } from 'next/navigation'
import { requireProfile, signOut } from '@/lib/auth'
import { Button } from '@/components/ui/button'

export default async function BusinessLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireProfile()
  if (profile.role !== 'business') redirect('/portal')
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <span className="font-semibold">DocFlow · Business</span>
        <form action={signOut} className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{profile.email}</span>
          <Button variant="outline" size="sm" type="submit">Sign out</Button>
        </form>
      </header>
      <main className="mx-auto max-w-4xl p-6">{children}</main>
    </div>
  )
}