import { requireProfile } from '@/lib/auth'
import { NotificationToggle } from '@/components/notification-toggle'

export async function SettingsPage() {
  const { profile } = await requireProfile()
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <NotificationToggle
        initial={Boolean((profile as any).email_notifications)}
        email={profile.email ?? ''}
      />
    </div>
  )
}