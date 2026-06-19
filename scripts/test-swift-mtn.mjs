/**
 * Swift API connectivity + MTN delivery smoke test.
 * Usage: node --env-file=.env.local scripts/test-swift-mtn.mjs
 * Set RUN_LIVE_DELIVERY=1 to place a real test order (charges API wallet).
 */

import { createClient } from '@supabase/supabase-js'

const PHONE = process.env.TEST_PHONE || '0550617425'
const RUN_LIVE = process.env.RUN_LIVE_DELIVERY === '1'
const swiftDataBaseUrl =
  process.env.SWIFTDATA_API_BASE_URL || 'https://lsocdjpflecduumopijn.supabase.co/functions/v1/developer-api'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const toDeliveryPhone = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '')
  if (digits.startsWith('233') && digits.length === 12) return `0${digits.slice(3)}`
  if (digits.length === 9) return `0${digits}`
  if (digits.length === 10 && digits.startsWith('0')) return digits
  if (digits.length > 10) return `0${digits.slice(-9)}`
  return digits
}

const toSwiftNetwork = (network) => {
  const value = String(network || '').trim().toUpperCase()
  if (value === 'MTN' || value === 'YELLO' || value === 'MTN_XPRESS') return 'MTN'
  if (value === 'TELECEL' || value === 'VODAFONE' || value === 'VOD' || value === 'RED') return 'TELECEL'
  if (value === 'AIRTELTIGO' || value === 'AT' || value === 'AIRTEL-TIGO') return 'AT'
  return value
}

async function resolveApiKey() {
  const envKey = (process.env.SWIFTDATA_DEVELOPER_KEY || process.env.SWIFTDATA_API_KEY || '').trim()
  if (envKey) return envKey

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase env vars and Swift API key')
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  for (const key of ['SWIFTDATA_DEVELOPER_KEY', 'SWIFTDATA_API_KEY']) {
    const { data } = await supabase.from('app_secrets').select('value').eq('key', key).maybeSingle()
    const value = (data?.value || '').trim()
    if (value) return value
  }

  throw new Error('Swift API key not found in env or app_secrets')
}

async function fetchPlans(apiKey) {
  const response = await fetch(`${swiftDataBaseUrl}/plans`, {
    headers: { 'X-API-Key': apiKey },
  })
  const payload = await response.json().catch(() => null)
  return { ok: response.ok, status: response.status, payload }
}

async function deliverMtn(apiKey, plan, reference) {
  const phone = toDeliveryPhone(PHONE)
  const endpoint = `${swiftDataBaseUrl}/payment/data`
  const body = {
    package_id: plan.package_id,
    phone,
    request_id: reference,
    allow_duplicate: true,
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': reference,
    },
    body: JSON.stringify(body),
  })

  const payload = await response.json().catch(() => null)
  return { ok: response.ok, status: response.status, payload, phone, body }
}

async function main() {
  console.log('Swift API base:', swiftDataBaseUrl)
  console.log('Test phone:', toDeliveryPhone(PHONE))

  const apiKey = await resolveApiKey()
  console.log('API key resolved:', `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`)

  const plansResult = await fetchPlans(apiKey)
  console.log('\n[1/2] Plans response:', plansResult.status, plansResult.payload?.success ?? plansResult.payload)

  const plans = plansResult.payload?.plans || []
  const mtnPlans = plans
    .filter((plan) => !plan.is_unavailable && toSwiftNetwork(plan.network) === 'MTN')
    .sort((a, b) => Number(a.api_price || 0) - Number(b.api_price || 0))

  console.log(`MTN plans available: ${mtnPlans.length}`)
  if (mtnPlans.length) {
    console.log('Cheapest MTN plan:', {
      package_id: mtnPlans[0].package_id,
      size: mtnPlans[0].package_size,
      price: mtnPlans[0].api_price,
    })
  }

  if (!RUN_LIVE) {
    console.log('\nSkipped live delivery. Set RUN_LIVE_DELIVERY=1 to place a real MTN test order.')
    return
  }

  if (!mtnPlans.length) {
    throw new Error('No MTN plans available for live delivery test')
  }

  const reference = `TEST-MTN-${Date.now()}`
  const delivery = await deliverMtn(apiKey, mtnPlans[0], reference)
  console.log('\n[2/2] Live delivery response:', delivery.status)
  console.log('Request phone:', delivery.phone)
  console.log('Payload:', delivery.payload)

  if (!delivery.ok || delivery.payload?.success === false) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error('Test failed:', error.message)
  process.exitCode = 1
})
