'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { setEmailNotifications } from '@/lib/actions/settings'
import { Loader2 } from 'lucide-react'

export function NotificationToggle({ initial, email }: { initial: boolean; email: string }) {
  const [on, setOn] = useState(initial)
  const [busy, setBusy] = useState(false)

  async function change(value: boolean) {
    setOn(value) // optimistic
    setBusy(true)
    const res = await setEmailNotifications(value)
    setBusy(false)
    if (res.error) {
      setOn(!value) // revert
      return toast.error(res.error)
    }
    toast.success(value ? 'Email notifications turned on' : 'Email notifications turned off')
  }

  return (
    <div className="flex items-start justify-between gap-6 rounded-md border p-4">
      <div className="space-y-1">
        <Label htmlFor="notif" className="text-base">Email notifications</Label>
        <p className="text-sm text-muted-foreground">
          Get an email at <span className="font-medium">{email}</span> when the other party comments,
          replies, requests changes, approves, or uploads a new version. Emails never include document
          content; you sign in to read the details.
        </p>
      </div>
      <div className="flex items-center gap-2">
       {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
       <Switch id="notif" checked={on} disabled={busy} onCheckedChange={change} />
       </div>
      </div>
  )
}