export type CanonicalNetwork = 'MTN' | 'AirtelTigo' | 'Telecel' | 'AFA' | 'Other'

const NETWORK_RANK: Record<CanonicalNetwork, number> = {
  MTN: 0,
  AirtelTigo: 1,
  Telecel: 2,
  AFA: 3,
  Other: 4,
}

const normalizeToken = (value: string) => String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')

export const normalizeNetwork = (value: string): CanonicalNetwork => {
  const token = normalizeToken(value)

  if (token === 'MTN' || token === 'YELLO' || token === 'MTNXPRESS') return 'MTN'
  if (token === 'AIRTELTIGO' || token === 'AT') return 'AirtelTigo'
  if (token === 'TELECEL' || token === 'VODAFONE' || token === 'VOD' || token === 'BIGTIME') return 'Telecel'
  if (token === 'AFA') return 'AFA'

  return 'Other'
}

export const compareNetworks = (a: string, b: string) => {
  const normalizedA = normalizeNetwork(a)
  const normalizedB = normalizeNetwork(b)
  const rankDifference = NETWORK_RANK[normalizedA] - NETWORK_RANK[normalizedB]

  if (rankDifference !== 0) {
    return rankDifference
  }

  return String(a || '').localeCompare(String(b || ''))
}

export const sortNetworks = (networks: string[]) => [...networks].sort(compareNetworks)

export const networkCardTheme = (network: string) => {
  const normalized = normalizeNetwork(network)

  if (normalized === 'MTN') {
    return {
      card: 'border-yellow-300/25 bg-yellow-300 text-black',
      badge: 'bg-black/10 text-black',
      button: 'bg-black text-yellow-300 hover:bg-zinc-900',
    }
  }

  if (normalized === 'Telecel') {
    return {
      card: 'border-red-300/40 bg-red-600 text-white',
      badge: 'bg-white/20 text-white',
      button: 'bg-white text-red-700 hover:bg-red-100',
    }
  }

  if (normalized === 'AirtelTigo') {
    return {
      card: 'border-blue-300/40 bg-blue-600 text-white',
      badge: 'bg-white/20 text-white',
      button: 'bg-white text-blue-700 hover:bg-blue-100',
    }
  }

  if (normalized === 'AFA') {
    return {
      card: 'border-amber-300/40 bg-amber-500 text-black',
      badge: 'bg-black/10 text-black',
      button: 'bg-black text-amber-200 hover:bg-zinc-900',
    }
  }

  return {
    card: 'border-zinc-300/30 bg-zinc-100 text-zinc-900',
    badge: 'bg-zinc-900/10 text-zinc-900',
    button: 'bg-zinc-900 text-white hover:bg-zinc-800',
  }
}
