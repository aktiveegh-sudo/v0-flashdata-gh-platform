import { normalizeAdminOrderStatus, type AdminOrderSource } from '@/lib/orders/status'

export type UnifiedOrderRow = {
  id: string
  source: AdminOrderSource | 'dashboard_airtime' | 'public_airtime'
  orderType: 'Data' | 'AFA' | 'Service' | 'Airtime'
  reference: string
  customerName: string
  customerEmail: string
  customerPhone: string
  itemLabel: string
  networkOrCategory: string
  amount: number
  status: string
  createdAt: string
  retryCount: number
  retryTargetOrderId: string | null
}

export type AdminOrderCategory = 'all' | 'data' | 'afa' | 'airtime' | 'services'

export const matchesOrderCategory = (row: UnifiedOrderRow, category: AdminOrderCategory) => {
  if (category === 'all') return true
  if (category === 'data') return row.orderType === 'Data'
  if (category === 'afa') return row.orderType === 'AFA'
  if (category === 'airtime') return row.orderType === 'Airtime'
  if (category === 'services') return row.orderType === 'Service'
  return true
}

export const orderCategoryMeta: Record<
  Exclude<AdminOrderCategory, 'all'>,
  { title: string; description: string; href: string; exportPrefix: string }
> = {
  data: {
    title: 'Data Orders',
    description: 'Dashboard and store data bundle purchases across the platform.',
    href: '/admin/orders/data',
    exportPrefix: 'data-orders',
  },
  afa: {
    title: 'AFA Orders',
    description: 'AFA registration orders from agents, dashboard, and store checkouts.',
    href: '/admin/orders/afa',
    exportPrefix: 'afa-orders',
  },
  airtime: {
    title: 'Airtime Orders',
    description: 'Airtime top-up requests from the agent dashboard and public site.',
    href: '/admin/orders/airtime',
    exportPrefix: 'airtime-orders',
  },
  services: {
    title: 'Service Orders',
    description: 'Other digital service purchases from agent stores and public checkout.',
    href: '/admin/orders/services',
    exportPrefix: 'service-orders',
  },
}

type DashboardDataOrderRow = {
  id: string
  user_id: string
  phone: string
  amount: number
  status: string
  reference: string
  retry_count: number
  created_at: string
  profiles?: { full_name: string | null; email: string | null } | null
  data_packages?: { network: string; name: string; amount: string } | null
}

type AfaOrderRow = {
  id: string
  user_id: string
  full_name: string
  phone: string
  amount: number
  status: string
  reference: string
  created_at: string
  profiles?: { full_name: string | null; email: string | null } | null
}

type StoreOrderRow = {
  id: string
  item_type: 'data' | 'service'
  customer_name: string
  customer_phone: string
  customer_email: string | null
  total_price: number
  status: string
  created_at: string
  data_packages?: { network: string; name: string; amount: string } | null
  online_services?: { name: string; category: string } | null
}

type AirtimeTxRow = {
  id: string
  user_id: string
  amount: number
  status: string
  reference: string
  description: string | null
  created_at: string
  metadata: Record<string, unknown> | null
  profiles?: { full_name: string | null; email: string | null; phone: string | null } | null
}

export const mapDashboardDataOrders = (rows: DashboardDataOrderRow[]): UnifiedOrderRow[] =>
  rows.map((row) => ({
    id: row.id,
    source: 'dashboard',
    orderType: 'Data',
    reference: row.reference || row.id,
    customerName: row.profiles?.full_name || 'Unknown User',
    customerEmail: row.profiles?.email || '-',
    customerPhone: row.phone,
    itemLabel: row.data_packages?.name || 'Data Package',
    networkOrCategory: row.data_packages?.network || '-',
    amount: Number(row.amount || 0),
    status: normalizeAdminOrderStatus(row.status),
    createdAt: row.created_at,
    retryCount: Number(row.retry_count || 0),
    retryTargetOrderId: row.id,
  }))

export const mapAfaOrders = (rows: AfaOrderRow[]): UnifiedOrderRow[] =>
  rows.map((row) => ({
    id: row.id,
    source: 'dashboard_afa',
    orderType: 'AFA',
    reference: row.reference || row.id,
    customerName: row.full_name || row.profiles?.full_name || 'Unknown User',
    customerEmail: row.profiles?.email || '-',
    customerPhone: row.phone,
    itemLabel: 'AFA Registration',
    networkOrCategory: 'AFA',
    amount: Number(row.amount || 0),
    status: normalizeAdminOrderStatus(row.status),
    createdAt: row.created_at,
    retryCount: 0,
    retryTargetOrderId: null,
  }))

export const mapStoreOrders = (rows: StoreOrderRow[]): UnifiedOrderRow[] =>
  rows.map((row) => {
    const isStoreAfa = row.item_type === 'data' && String(row.data_packages?.network || '').trim().toUpperCase() === 'AFA'
    const category = String(row.online_services?.category || row.online_services?.name || '').toLowerCase()
    const isAirtimeService = row.item_type === 'service' && category.includes('airtime')

    return {
      id: row.id,
      source: row.item_type === 'service' ? 'store_service' : isStoreAfa ? 'store_afa' : 'store_data',
      orderType: isAirtimeService ? 'Airtime' : row.item_type === 'service' ? 'Service' : isStoreAfa ? 'AFA' : 'Data',
      reference: `STORE-${row.id.slice(0, 8).toUpperCase()}`,
      customerName: row.customer_name || 'Store Customer',
      customerEmail: row.customer_email || '-',
      customerPhone: row.customer_phone,
      itemLabel:
        row.item_type === 'service'
          ? row.online_services?.name || 'Store Service'
          : isStoreAfa
            ? 'Store AFA Registration'
            : row.data_packages?.name || 'Store Data',
      networkOrCategory:
        row.item_type === 'service'
          ? row.online_services?.category || 'Service'
          : row.data_packages?.network || '-',
      amount: Number(row.total_price || 0),
      status: normalizeAdminOrderStatus(row.status),
      createdAt: row.created_at,
      retryCount: 0,
      retryTargetOrderId: null,
    }
  })

export const mapAirtimeTransactions = (rows: AirtimeTxRow[]): UnifiedOrderRow[] =>
  rows.map((row) => {
    const metadata = row.metadata || {}
    const phone = String(metadata.phone || row.profiles?.phone || '-')
    const network = String(metadata.network || '-')
    const source = String(metadata.source || '').includes('public') ? 'public_airtime' : 'dashboard_airtime'

    return {
      id: row.id,
      source,
      orderType: 'Airtime',
      reference: row.reference || row.id,
      customerName: row.profiles?.full_name || 'Unknown User',
      customerEmail: row.profiles?.email || '-',
      customerPhone: phone,
      itemLabel: row.description || `${network} Airtime`,
      networkOrCategory: network,
      amount: Number(row.amount || 0),
      status: normalizeAdminOrderStatus(row.status === 'success' ? 'delivered' : row.status),
      createdAt: row.created_at,
      retryCount: 0,
      retryTargetOrderId: null,
    }
  })
