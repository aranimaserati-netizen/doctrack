'use server'

import { revalidatePath } from 'next/cache'
import { requireProfile } from '@/lib/auth'

export async function setEmailNotifications(enabled: boolean): Promise<{ error?: string }> {
  const { supabase } = await requireProfile()
  // Calls the database function from 08_notifications.sql. It only ever
  // updates the caller's own email_notifications flag, nothing else.
  const { error } = await supabase.rpc('set_email_notifications', { p_enabled: enabled })
  if (error) return { error: error.message }
  revalidatePath('/business/settings')
  revalidatePath('/portal/settings')
  return {}
}