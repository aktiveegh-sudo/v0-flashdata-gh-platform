import { redirect } from 'next/navigation'

export default function ReportIssuePage() {
  redirect('/dashboard/contact-support?topic=issue')
}
