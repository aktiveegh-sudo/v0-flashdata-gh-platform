import { redirect } from 'next/navigation'

type StorePageProps = {
  params: Promise<{ slug: string }>
}

export default async function StoreServicesPage({ params }: StorePageProps) {
  const { slug } = await params
  redirect(`/store/${slug}#services`)
}
