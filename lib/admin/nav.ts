import {
  LayoutDashboard,
  BarChart3,
  Users,
  UserCog,
  UsersRound,
  TrendingUp,
  ClipboardList,
  Layers,
  Package,
  Code2,
  Globe,
  Landmark,
  Wallet,
  CreditCard,
  CircleDollarSign,
  PieChart,
  Scale,
  KeyRound,
  Radio,
  Bell,
  ImageIcon,
  Ticket,
  Megaphone,
  MessageSquare,
  HeadphonesIcon,
  Settings,
  ShieldCheck,
  ScrollText,
  Activity,
  FileText,
  Flag,
  Bot,
  Sparkles,
  Store,
  PlusSquare,
  Phone,
  Smartphone,
  ShoppingBag,
  type LucideIcon,
} from 'lucide-react'

export type AdminNavItem = {
  label: string
  href: string
  icon: LucideIcon
  badge?: string
}

export type AdminNavSection = {
  title: string
  items: AdminNavItem[]
}

/** Matches SwiftData admin sidebar Og array order */
export const adminNavSections: AdminNavSection[] = [
  {
    title: 'Main',
    items: [
      { label: 'Overview', href: '/admin', icon: LayoutDashboard },
      { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Flash Vendor Master', href: '/admin/swift-vendor', icon: Store },
      { label: 'Agents', href: '/admin/agents', icon: UserCog },
      { label: 'Sub-Agents', href: '/admin/sub-agents', icon: UsersRound },
      { label: 'Orders', href: '/admin/orders', icon: ClipboardList },
      { label: 'Data Orders', href: '/admin/orders/data', icon: Smartphone },
      { label: 'AFA Orders', href: '/admin/orders/afa', icon: Radio },
      { label: 'Airtime Orders', href: '/admin/orders/airtime', icon: Phone },
      { label: 'Service Orders', href: '/admin/orders/services', icon: ShoppingBag },
      { label: 'Mash Up Orders', href: '/admin/mashup-orders', icon: Layers },
      { label: 'Packages', href: '/admin/packages', icon: Package },
      { label: 'Add Service', href: '/admin/add-service', icon: PlusSquare },
      { label: 'Promo Codes', href: '/admin/promotions', icon: Ticket },
      { label: 'Wallet Top-Up', href: '/admin/wallet-topup', icon: Wallet },
      { label: 'Withdrawals', href: '/admin/withdrawals', icon: Landmark },
      { label: 'Reconciliation', href: '/admin/reconciliation', icon: Scale },
      { label: 'Profits', href: '/admin/profits', icon: CircleDollarSign },
      { label: 'Agent Performance', href: '/admin/agent-performance', icon: TrendingUp },
      { label: 'P&L Report', href: '/admin/pnl', icon: PieChart },
      { label: 'Credit Mgmt', href: '/admin/credit-management', icon: CreditCard },
      { label: 'Broadcast', href: '/admin/broadcast', icon: Radio },
      { label: 'Promo Banners', href: '/admin/banners', icon: ImageIcon },
    ],
  },
  {
    title: 'Support & Users',
    items: [
      { label: 'Support Tickets', href: '/admin/tickets', icon: HeadphonesIcon },
      { label: 'Notifications', href: '/admin/notifications', icon: Bell },
      { label: 'Engagement Hub', href: '/admin/engagement', icon: Megaphone },
      { label: 'Users', href: '/admin/users', icon: Users },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Security', href: '/admin/security', icon: ShieldCheck },
      { label: 'System Health', href: '/admin/system-health', icon: Activity },
      { label: 'Sentinel AI', href: '/admin/sentinel', icon: Bot },
      { label: 'AI Intelligence Hub', href: '/admin/ai-strategy', icon: Sparkles },
      { label: 'API Network Intelligence', href: '/admin/api-network', icon: Globe },
      { label: 'System Logs', href: '/admin/system-logs', icon: FileText },
      { label: 'Feature Flags', href: '/admin/feature-flags', icon: Flag },
      { label: 'SMS Templates', href: '/admin/sms-templates', icon: MessageSquare },
      { label: 'Audit Logs', href: '/admin/audit-logs', icon: ScrollText },
      { label: 'API Users', href: '/admin/api-users', icon: KeyRound },
      { label: 'API Orders', href: '/admin/api-orders', icon: Code2 },
      { label: 'Settings', href: '/admin/settings', icon: Settings },
    ],
  },
  {
    title: 'Account',
    items: [{ label: 'My Security', href: '/admin/account-settings', icon: KeyRound }],
  },
]

export const adminPageLabels: Record<string, string> = {
  '/admin': 'Overview',
  '/admin/overview': 'Overview',
  '/admin/analytics': 'Analytics',
  '/admin/swift-vendor': 'Flash Vendor Master',
  '/admin/flash-vendor': 'Flash Vendor Master',
  '/admin/agents': 'Agents',
  '/admin/sub-agents': 'Sub-Agents',
  '/admin/orders': 'Orders',
  '/admin/orders/data': 'Data Orders',
  '/admin/orders/afa': 'AFA Orders',
  '/admin/orders/airtime': 'Airtime Orders',
  '/admin/orders/services': 'Service Orders',
  '/admin/mashup-orders': 'Mash Up Orders',
  '/admin/packages': 'Packages',
  '/admin/promotions': 'Promo Codes',
  '/admin/wallet-topup': 'Wallet Top-Up',
  '/admin/withdrawals': 'Withdrawals',
  '/admin/reconciliation': 'Reconciliation',
  '/admin/profits': 'Profits',
  '/admin/agent-performance': 'Agent Performance',
  '/admin/pnl': 'P&L Report',
  '/admin/credit-management': 'Credit Mgmt',
  '/admin/broadcast': 'Broadcast',
  '/admin/banners': 'Promo Banners',
  '/admin/tickets': 'Support Tickets',
  '/admin/notifications': 'Notifications',
  '/admin/engagement': 'Engagement Hub',
  '/admin/users': 'Users',
  '/admin/security': 'Security',
  '/admin/system-health': 'System Health',
  '/admin/sentinel': 'Sentinel AI',
  '/admin/ai-strategy': 'AI Intelligence Hub',
  '/admin/api-network': 'API Network Intelligence',
  '/admin/system-logs': 'System Logs',
  '/admin/feature-flags': 'Feature Flags',
  '/admin/sms-templates': 'SMS Templates',
  '/admin/audit-logs': 'Audit Logs',
  '/admin/api-users': 'API Users',
  '/admin/api-orders': 'API Orders',
  '/admin/settings': 'Settings',
  '/admin/site-settings': 'Settings',
  '/admin/account-settings': 'My Security',
  '/admin/add-service': 'Add Service',
  '/admin/afa': 'AFA Control',
  '/admin/send-notification': 'Broadcast',
}

export function resolveAdminPageTitle(pathname: string): string {
  if (adminPageLabels[pathname]) {
    return adminPageLabels[pathname]
  }

  const matched = Object.keys(adminPageLabels)
    .filter((key) => key !== '/admin' && pathname.startsWith(key))
    .sort((a, b) => b.length - a.length)[0]

  return matched ? adminPageLabels[matched] : 'Admin'
}
