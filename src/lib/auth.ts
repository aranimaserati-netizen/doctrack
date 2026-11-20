import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function requireProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, customer_org_id, email_notifications')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login?error=No profile found for this account')
  return { supabase, profile }
}

export async function signOut() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}