/**
 * Swift Reseller connectivity + optional live Yello delivery smoke test.
 * Usage: node --env-file=.env.local scripts/test-swift-reseller.mjs
 * Set RUN_LIVE_DELIVERY=1 to place a real test order (charges API wallet).
 */

const PHONE = process.env.TEST_PHONE || '0550617425'
const RUN_LIVE = process.env.RUN_LIVE_DELIVERY === '1'
const apiKey = process.env.SWIFTDATA_DEVELOPER_KEY || process.env.SWIFTDATA_API_KEY || process.env.SWIFT_RESELLER_API_KEY
const baseUrl = (
  process.env.SWIFTDATA_API_BASE_URL ||
  'https://ihrvvniomtoofrjkmalb.supabase.co/functions/v1/api'
).replace(/\/$/, '')

const headers = {
  Authorization: `Bearer ${apiKey}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
}

const main = async () => {
  if (!apiKey) {
    console.error('Missing SWIFTDATA_DEVELOPER_KEY')
    process.exit(1)
  }

  console.log('Base URL:', baseUrl)

  const health = await fetch(`${baseUrl}/v1/health`, { headers })
  const healthBody = await health.json().catch(() => null)
  console.log('Health:', health.status, healthBody)

  const balance = await fetch(`${baseUrl}/v1/balance`, { headers })
  const balanceBody = await balance.json().catch(() => null)
  console.log('Balance:', balance.status, balanceBody)

  const packages = await fetch(`${baseUrl}/v1/packages`, { headers })
  const packagesBody = await packages.json().catch(() => null)
  console.log('Packages count:', packagesBody?.packages?.length ?? 0)
  console.log('Networks:', packagesBody?.networks)

  if (!RUN_LIVE) {
    console.log('Skipping live buy (set RUN_LIVE_DELIVERY=1 to purchase)')
    return
  }

  const buy = await fetch(`${baseUrl}/v1/buy-data`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      phone: PHONE,
      network: 'yello',
      size_gb: 1,
      reference: `TEST-${Date.now()}`,
    }),
  })
  const buyBody = await buy.json().catch(() => null)
  console.log('Buy:', buy.status, buyBody)

  if (buyBody?.order?.reference) {
    const order = await fetch(`${baseUrl}/v1/orders/${encodeURIComponent(buyBody.order.reference)}`, { headers })
    const orderBody = await order.json().catch(() => null)
    console.log('Order:', order.status, orderBody)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
