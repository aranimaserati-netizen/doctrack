import { redirect } from 'next/navigation'
import { requireProfile } from '@/lib/auth'
import { AppShell } from '@/components/app-shell'

export default async function BusinessLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireProfile()
  if (profile.role !== 'business') redirect('/portal')
  return (
    <AppShell
      brand="Maserati"
      homeHref="/business"
      email={profile.email ?? ''}
      links={[
        { href: '/business', label: 'Dealers' },
        { href: '/business/settings', label: 'Settings' },
      ]}
    >
      {children}
    </AppShell>
  )
}