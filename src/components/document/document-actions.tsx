'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle2, Lock } from 'lucide-react'
import { approveDocument, markFinal } from '@/lib/actions/review'
import { LoadingButton } from '@/components/loading-button'

export function DocumentActions({
  documentId,
  role,
  status,
}: {
  documentId: string
  role: 'business' | 'customer'
  status: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  if (status === 'final') return null

  async function run(fn: () => Promise<{ error?: string }>, ok: string) {
    setBusy(true)
    const res = await fn()
    setBusy(false)
    if (res.error) return toast.error(res.error)
    toast.success(ok)
    router.refresh()
  }

  const isCustomer = role === 'customer'
  const canApprove = ['uploaded', 'in_review', 'revised'].includes(status)

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#BFCBD0] bg-white/70 p-3">
      {isCustomer && canApprove && (
        <LoadingButton
          loading={busy}
          className="bg-[#4F7F2E] text-white hover:bg-[#3F6A25]"
          onClick={() => confirm('Approve this document?') && run(() => approveDocument(documentId), 'Document approved')}
        >
          <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
        </LoadingButton>
      )}

      {!isCustomer && status === 'approved' && (
        <LoadingButton
          loading={busy}
          className="bg-[#4F7F2E] text-white hover:bg-[#3F6A25]"
          onClick={() =>
            confirm('Mark this document as FINAL? It will be locked: no more comments.') &&
            run(() => markFinal(documentId), 'Document marked as final')
          }
        >
          <Lock className="mr-2 h-4 w-4" /> Mark as final
        </LoadingButton>
      )}

      <p className="text-sm text-[#2F3556]/70">
        {isCustomer && status === 'approved' && 'You approved this document. Waiting for the business to finalize it.'}
        {isCustomer && status !== 'approved' && 'Comment on any text, then approve when you are happy with the document.'}
        {!isCustomer && status === 'approved' && 'Approved by the dealer. You can mark it as final.'}
        {!isCustomer && status !== 'approved' && 'Waiting for the dealer to review and approve.'}
      </p>
    </div>
  )
}