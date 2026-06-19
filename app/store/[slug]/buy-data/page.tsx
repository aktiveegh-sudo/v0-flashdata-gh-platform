import { redirect } from 'next/navigation'

type StorePageProps = {
  params: Promise<{ slug: string }>
}

export default async function StoreBuyDataPage({ params }: StorePageProps) {
  const { slug } = await params
  redirect(`/store/${slug}#bundles`)
}
