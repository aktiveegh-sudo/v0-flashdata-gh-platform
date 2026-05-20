import { supabase } from '@/lib/supabase/client'

type PaystackInitializePayload = {
  flow:
    | 'wallet_topup'
    | 'dashboard_data'
    | 'dashboard_afa'
    | 'store_data'
    | 'store_service'
    | 'store_afa'
    | 'public_data'
    | 'public_service'
    | 'public_afa'
  amount?: number
  packageId?: string
  serviceId?: string
  phone?: string
  fullName?: string
  ghanaCardNumber?: string
  location?: string
  storeId?: string
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  paymentMethod?: string
  redirectPath?: string
}

export const startPaystackCheckout = async (payload: PaystackInitializePayload) => {
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token

  const response = await fetch('/api/paystack/initialize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(payload),
  })

  const result = (await response.json()) as {
    success: boolean
    error?: string
    data?: { authorization_url: string }
  }

  if (!response.ok || !result.success || !result.data?.authorization_url) {
    throw new Error(result.error || 'Unable to initialize Paystack payment')
  }

  const url = result.data.authorization_url
  if (!/^https?:\/\//i.test(url)) {
    throw new Error('Invalid Paystack authorization URL')
  }

  // Use direct href assignment for the most reliable full-page redirect behavior.
  window.location.href = url
}