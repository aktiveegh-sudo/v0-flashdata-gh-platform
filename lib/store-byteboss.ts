import type { StoreDataPackage } from '@/lib/store-tenant'
import { compareNetworks, normalizeNetwork, sortNetworks } from '@/lib/network-order'

export const parsePackageGb = (amount: string) => {
  const match = String(amount || '').match(/([\d.]+)\s*GB/i)
  return match ? match[1] : String(amount || '').replace(/\s+/g, '')
}

export const formatNetworkLabel = (network: string) => {
  const normalized = normalizeNetwork(network)
  if (normalized === 'AirtelTigo') return 'AirtelTigo'
  if (normalized === 'Telecel') return 'Telecel'
  if (normalized === 'MTN') return 'MTN'
  if (normalized === 'AFA') return 'AFA'
  return network
}

export const bytebossNetworkCardClass = (network: string) => {
  const normalized = normalizeNetwork(network)
  if (normalized === 'MTN') {
    return 'border-yellow-400/60 bg-yellow-400 text-black hover:border-yellow-400 hover:shadow-[0_0_24px_rgba(250,204,21,0.35)]'
  }
  if (normalized === 'Telecel') {
    return 'border-red-500/50 bg-red-600 text-white hover:border-red-500 hover:shadow-[0_0_24px_rgba(220,38,38,0.35)]'
  }
  if (normalized === 'AirtelTigo') {
    return 'border-blue-500/50 bg-blue-600 text-white hover:border-blue-500 hover:shadow-[0_0_24px_rgba(37,99,235,0.35)]'
  }
  if (normalized === 'AFA') {
    return 'border-amber-400/50 bg-amber-500 text-black hover:border-amber-400 hover:shadow-[0_0_24px_rgba(245,158,11,0.35)]'
  }
  return 'border-zinc-400/50 bg-zinc-200 text-zinc-900'
}

export const bytebossNetworkBadgeClass = (network: string) => {
  const normalized = normalizeNetwork(network)
  if (normalized === 'MTN') return 'bg-black/10 text-black'
  if (normalized === 'Telecel') return 'bg-white/20 text-white'
  if (normalized === 'AirtelTigo') return 'bg-white/20 text-white'
  if (normalized === 'AFA') return 'bg-black/10 text-black'
  return 'bg-zinc-900/10 text-zinc-900'
}

export const groupStorePackagesByNetwork = (packages: StoreDataPackage[]) => {
  const map = new Map<string, StoreDataPackage[]>()
  for (const pkg of packages) {
    const key = pkg.network || 'Other'
    const list = map.get(key) || []
    list.push(pkg)
    map.set(key, list)
  }

  return sortNetworks(Array.from(map.keys())).map((network) => ({
    network,
    items: (map.get(network) || []).sort((a, b) => Number(a.price || 0) - Number(b.price || 0)),
  }))
}

export const buildWhatsAppUrl = (phone: string, message: string) => {
  const digits = phone.replace(/\D/g, '')
  let normalized = digits
  if (digits.startsWith('0')) normalized = `233${digits.slice(1)}`
  else if (!digits.startsWith('233')) normalized = `233${digits}`
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`
}
