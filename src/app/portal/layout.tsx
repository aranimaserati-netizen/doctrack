import { redirect } from 'next/navigation'
import { requireProfile } from '@/lib/auth'
import { AppShell } from '@/components/app-shell'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireProfile()
  if (profile.role !== 'customer') redirect('/business')
  return (
    <AppShell
      brand="Dealer"
      homeHref="/portal"
      email={profile.email ?? ''}
      links={[
        { href: '/portal', label: 'Documents' },
        { href: '/portal/settings', label: 'Notifications' },
      ]}
    >
      {children}
    </AppShell>
  )
}