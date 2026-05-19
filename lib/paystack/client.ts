type PaystackInitializePayload = {
  flow: 'wallet_topup' | 'dashboard_data' | 'dashboard_afa' | 'store_data' | 'store_service' | 'store_afa'
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
  if (!process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY) {
    throw new Error('Missing Paystack public key configuration')
  }

  const response = await fetch('/api/paystack/initialize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

  window.location.assign(result.data.authorization_url)
}