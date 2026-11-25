import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'

export type NotifyKind =
  | 'comment'
  | 'reply'
  | 'approved'
  | 'changes_requested'
  | 'new_version'
  | 'revised_no_changes'
  | 'final'
  | 'new_document'

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Deliberately no document or comment content: email is not a secure channel.
const wording: Record<NotifyKind, (actor: string, title: string) => { subject: string; line: string }> = {
  comment: (a, t) => ({ subject: `New comment on “${t}”`, line: `${a} added a comment on “${t}”.` }),
  reply: (a, t) => ({ subject: `New reply on “${t}”`, line: `${a} replied to a comment on “${t}”.` }),
  approved: (a, t) => ({ subject: `Approved: “${t}”`, line: `${a} approved “${t}”.` }),
  changes_requested: (a, t) => ({
    subject: `Changes requested on “${t}”`,
    line: `${a} requested changes on “${t}”.`,
  }),
  new_version: (a, t) => ({
    subject: `New version of “${t}”`,
    line: `${a} uploaded a new version of “${t}”.`,
  }),
  revised_no_changes: (a, t) => ({
    subject: `“${t}” marked as revised`,
    line: `${a} marked “${t}” as revised without file changes. The reason is shown on the document.`,
  }),
  final: (a, t) => ({
    subject: `Final version: “${t}”`,
    line: `${a} marked “${t}” as final. The document is now locked.`,
  }),
  new_document: (a, t) => ({
  subject: `New document shared: “${t}”`,
  line: `${a} shared a new document with you: “${t}”.`,
}),
}

export async function notifyDocumentEvent(args: {
  documentId: string
  kind: NotifyKind
  actorName: string
}) {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) return // notifications not configured: silently skip

    const supabase = await createClient()
    const { data: doc } = await supabase
      .from('documents')
      .select('title')
      .eq('id', args.documentId)
      .maybeSingle()
    if (!doc) return

    const { data: recipients } = await supabase.rpc('get_notification_recipients', {
      p_doc_id: args.documentId,
    })
    if (!recipients?.length) return

    const resend = new Resend(apiKey)
    const from = process.env.EMAIL_FROM ?? 'DocFlow <onboarding@resend.dev>'
    const base = process.env.APP_URL ?? 'http://localhost:3000'
    const redirect = process.env.EMAIL_DEV_REDIRECT
    const { subject, line } = wording[args.kind](args.actorName, doc.title)

    for (const r of recipients as { email: string; full_name: string | null; role: string }[]) {
      const area = r.role === 'business' ? '/business' : '/portal'
      const link = `${base}${area}/documents/${args.documentId}`
      const settings = `${base}${area}/settings`

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:480px;line-height:1.5">
          <p>Hi ${esc(r.full_name ?? '')},</p>
          <p>${esc(line)}</p>
          <p><a href="${link}" style="background:#111;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Open document</a></p>
          <p style="color:#666;font-size:12px">You'll need to sign in to view it.
          You receive this because you turned on email notifications.
          <a href="${settings}">Turn them off in Settings</a>.</p>
        </div>`
      const text = `${line}\n\nOpen: ${link}\n\nTurn off notifications: ${settings}`

      const { error } = await resend.emails.send({
        from,
        to: redirect ?? r.email,
        subject: redirect ? `[to: ${r.email}] ${subject}` : subject,
        html,
        text,
      })
      if (error) console.error('Email failed for', r.email, error)
    }
  } catch (e) {
    console.error('notifyDocumentEvent failed', e) // never break the user's action
  }
}