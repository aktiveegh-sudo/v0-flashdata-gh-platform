import 'server-only'

import { supabaseAdmin } from '@/lib/api/rest'

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
  storeId: string
  name: string
  slug: string
  active: boolean
  description: string
  heroText: string
  themeColor: string
  logoUrl: string | null
  whatsappNumber: string | null
  contactPhone: string | null
  dataPackages: StoreDataPackage[]
  services: StoreService[]
}

type AgentStoreRow = {
  id: string
  brand_name: string
  slug: string
  tagline: string | null
  description: string | null
  logo_url: string | null
  cover_url: string | null
  theme_color: string | null
  allow_data: boolean
  allow_online_services: boolean
  is_active: boolean
}

type AgentStorePackageRow = {
  id: string
  selling_price: number | string
  data_packages: {
    id: string
    network: string
    name: string
    amount: string
    validity: string
  } | null
}

type AgentStoreServiceRow = {
  id: string
  selling_price: number | string
  online_services: {
    id: string
    name: string
    category: string
    description: string | null
  } | null
}

const toNumber = (value: number | string) => Number(value || 0)

export const getStoreRecordBySlug = async (slug: string): Promise<StoreRecord | null> => {
  const normalizedSlug = slug.trim().toLowerCase()
  if (!normalizedSlug) {
    return null
  }

  const { data: store, error: storeError } = await supabaseAdmin
    .from('agent_stores')
    .select(
      'id,brand_name,slug,tagline,description,logo_url,cover_url,theme_color,whatsapp_number,contact_phone,allow_data,allow_online_services,is_active'
    )
    .eq('slug', normalizedSlug)
    .maybeSingle<
      AgentStoreRow & {
        whatsapp_number?: string | null
        contact_phone?: string | null
      }
    >()

  if (storeError || !store || !store.is_active) {
    return null
  }

  const [packagesResult, servicesResult] = await Promise.all([
    supabaseAdmin
      .from('agent_store_packages')
      .select('id,selling_price,data_packages!inner(id,network,name,amount,validity)')
      .eq('store_id', store.id)
      .eq('is_active', true)
      .order('selling_price', { ascending: true }),
    supabaseAdmin
      .from('agent_store_service_prices')
      .select('id,selling_price,online_services!inner(id,name,category,description)')
      .eq('store_id', store.id)
      .eq('is_active', true)
      .order('selling_price', { ascending: true }),
  ])

  const storePackages = ((packagesResult.data || []) as AgentStorePackageRow[]).map((item) => ({
    id: item.data_packages?.id || item.id,
    network: item.data_packages?.network || 'Unknown',
    name: item.data_packages?.name || 'Data Package',
    amount: item.data_packages?.amount || '',
    price: toNumber(item.selling_price),
    validity: item.data_packages?.validity || 'N/A',
  }))

  const storeServices = ((servicesResult.data || []) as AgentStoreServiceRow[]).map((item) => ({
    id: item.online_services?.id || item.id,
    name: item.online_services?.name || 'Service',
    category: item.online_services?.category || 'Service',
    price: toNumber(item.selling_price),
    description: item.online_services?.description || 'Digital service available at this store.',
  }))

  return {
    storeId: store.id,
    name: store.brand_name,
    slug: store.slug,
    active: store.is_active,
    description: store.description?.trim() || store.tagline?.trim() || `${store.brand_name} store`,
    heroText: store.tagline?.trim() || store.description?.trim() || `Shop at ${store.brand_name}`,
    themeColor: store.theme_color || '#0ea5e9',
    logoUrl: store.logo_url,
    whatsappNumber: store.whatsapp_number?.trim() || store.contact_phone?.trim() || null,
    contactPhone: store.contact_phone?.trim() || null,
    dataPackages: store.allow_data ? storePackages : [],
    services: store.allow_online_services ? storeServices : [],
  }
}