export type StoreDataPackage = {
  id: string
  network: string
  name: string
  amount: string
  price: number
  validity: string
}

export type StoreService = {
  id: string
  name: string
  category: string
  price: number
  description: string
}

export type StoreRecord = {
  name: string
  slug: string
  active: boolean
  description: string
  heroText: string
  themeColor: string
  logoUrl: string | null
  dataPackages: StoreDataPackage[]
  services: StoreService[]
}

const mockStores: Record<string, StoreRecord> = {
  amadata: {
    name: 'Ama Data Hub',
    slug: 'amadata',
    active: true,
    description: 'Fast data bundles and digital services for customers who want a clean, focused buying experience.',
    heroText: 'Buy data and services instantly from Ama Data Hub.',
    themeColor: '#16a34a',
    logoUrl: null,
    dataPackages: [
      { id: 'pkg-1', network: 'MTN', name: 'MTN 1.5GB', amount: '1.5GB', price: 15.5, validity: '30 Days' },
      { id: 'pkg-2', network: 'Telecel', name: 'Telecel 3GB', amount: '3GB', price: 28, validity: '30 Days' },
      { id: 'pkg-3', network: 'Airtel-Tigo', name: 'AT 500MB', amount: '500MB', price: 6, validity: '24 Hours' },
    ],
    services: [
      { id: 'svc-1', name: 'Airtime Top-up', category: 'Airtime', price: 1, description: 'Recharge any network quickly.' },
      { id: 'svc-2', name: 'Bill Payment', category: 'Bills', price: 2, description: 'Utility and subscription payments.' },
    ],
  },
  netplus: {
    name: 'NetPlus Store',
    slug: 'netplus',
    active: true,
    description: 'A compact storefront for mobile data and top-up purchases.',
    heroText: 'Simple, fast, and built for daily data reselling.',
    themeColor: '#0f766e',
    logoUrl: null,
    dataPackages: [
      { id: 'pkg-4', network: 'MTN', name: 'MTN 500MB', amount: '500MB', price: 6.5, validity: '7 Days' },
      { id: 'pkg-5', network: 'Telecel', name: 'Telecel 1GB', amount: '1GB', price: 11, validity: '7 Days' },
    ],
    services: [
      { id: 'svc-3', name: 'Airtime Top-up', category: 'Airtime', price: 1, description: 'Instant airtime recharge.' },
    ],
  },
}

export const getMockStoreBySlug = (slug: string): StoreRecord | null => {
  const normalizedSlug = slug.trim().toLowerCase()
  if (!normalizedSlug) {
    return null
  }

  return mockStores[normalizedSlug] || null
}