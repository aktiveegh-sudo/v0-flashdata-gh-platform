export const ORDER_AUTO_PROCESSING_AFTER_MS = 60 * 1000
export const ORDER_AUTO_DELIVERED_AFTER_MS = 14 * 60 * 1000

export type DashboardOrderStatus = 'pending' | 'processing' | 'delivered' | 'failed'
export type StoreOrderStatus = 'pending' | 'processing' | 'delivered' | 'declined'
export type AfaOrderStatus = 'pending' | 'processing' | 'delivered' | 'rejected'

export type AdminOrderSource =
  | 'dashboard'
  | 'dashboard_afa'
  | 'store_data'
  | 'store_service'
  | 'store_afa'
  | 'dashboard_airtime'
  | 'public_airtime'

export const normalizeAdminOrderStatus = (status: string) => {
  const value = String(status || '').trim().toLowerCase()

  if (value === 'success' || value === 'completed' || value === 'accepted') {
    return 'delivered'
  }

  return value
}

export const adminStatusOptions: Record<AdminOrderSource, string[]> = {
  dashboard: ['pending', 'processing', 'delivered', 'failed'],
  dashboard_afa: ['pending', 'processing', 'delivered', 'rejected'],
  store_data: ['pending', 'processing', 'delivered', 'declined'],
  store_service: ['pending', 'processing', 'delivered', 'declined'],
  store_afa: ['pending', 'processing', 'delivered', 'declined'],
  dashboard_airtime: ['pending', 'processing', 'delivered', 'failed'],
  public_airtime: ['pending', 'processing', 'delivered', 'failed'],
}
