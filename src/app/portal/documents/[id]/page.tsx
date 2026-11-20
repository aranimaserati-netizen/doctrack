import { DocumentPage } from '@/components/document/document-page'

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ v?: string; at?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  return <DocumentPage id={id} backHref="/portal" searchParams={sp} />
}