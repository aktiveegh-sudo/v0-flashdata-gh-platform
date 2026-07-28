import {
  Home,
  Wallet,
  Wifi,
  Phone,
  Receipt,
  Store,
  Settings,
  Code2,
  Users,
  Share2,
  Trophy,
  Megaphone,
  ImageIcon,
  Layers,
  ClipboardCheck,
  RefreshCw,
  MessageCircle,
  Globe,
  Bell,
  User,
  AlertCircle,
  Sparkles,
  BookUser,
  Zap,
  Tag,
  ShoppingCart,
  Percent,
  type LucideIcon,
} from 'lucide-react'

export type DashboardNavItem = {
  label: string
  href: string
  icon: LucideIcon
  badge?: string
  subAgentHidden?: boolean
}

/** Primary sidebar items — matches SwiftData Hm array order */
export const dashboardMainNavItems: DashboardNavItem[] = [
  { label: 'Overview', href: '/dashboard', icon: Home },
  { label: 'My Profile', href: '/dashboard/profile', icon: User },
  { label: 'Account & Security', href: '/dashboard/account-settings', icon: Settings },
  { label: 'Account Balance', href: '/dashboard/wallet', icon: Wallet },
  { label: 'Auto-Renewal', href: '/dashboard/schedule', icon: RefreshCw },
  { label: 'Transactions', href: '/dashboard/transactions', icon: Receipt },
  { label: 'Inbox Notifications', href: '/dashboard/notifications', icon: Bell },
  { label: 'Buy Data', href: '/dashboard/buy-data/mtn', icon: Wifi },
  { label: 'Buy Airtime', href: '/dashboard/buy-airtime', icon: Phone },
  { label: 'Other Services', href: '/dashboard/utilities', icon: Zap },
  { label: 'AFA Registration', href: '/dashboard/afa', icon: Sparkles },
  { label: 'My Store', href: '/dashboard/my-store', icon: Store },
  { label: 'Report Issue', href: '/dashboard/report-issue', icon: AlertCircle },
  { label: 'Address Book', href: '/dashboard/customers', icon: BookUser },
  { label: 'Referral Program', href: '/dashboard/referral', icon: Share2, subAgentHidden: true },
]

/** Collapsible "More Options" items — matches SwiftData Um array order */
export const dashboardMoreNavItems: DashboardNavItem[] = [
  { label: 'Buy Other Services', href: '/dashboard/buy-services', icon: ShoppingCart },
  { label: 'Store Service Pricing', href: '/dashboard/other-services', icon: Percent },
  { label: 'Agent Prices', href: '/dashboard/agent-prices', icon: Tag },
  { label: 'Withdrawals', href: '/dashboard/withdrawals', icon: Wallet },
  { label: 'Store Settings', href: '/dashboard/store-settings', icon: Settings },
  { label: 'Subagents', href: '/dashboard/subagents', icon: Users, badge: 'New', subAgentHidden: true },
  { label: 'Subagent Pricing', href: '/dashboard/subagent-pricing', icon: Tag, subAgentHidden: true },
  { label: 'Subagent Orders', href: '/dashboard/subagent-orders', icon: ClipboardCheck, subAgentHidden: true },
  { label: 'Flyer Generator', href: '/dashboard/flyer', icon: ImageIcon },
  { label: 'Marketing Tools', href: '/dashboard/marketing', icon: Megaphone },
  { label: 'Result Checker', href: '/dashboard/result-checker', icon: ClipboardCheck },
  { label: 'My API Access', href: '/dashboard/api', icon: Code2 },
  { label: 'Agent Developer Hub', href: '/dashboard/agent-dev-hub', icon: Globe },
  { label: 'Bulk Disbursement', href: '/dashboard/bulk', icon: Layers },
  { label: 'WhatsApp Bot', href: '/dashboard/whatsapp-bot', icon: MessageCircle },
  { label: 'Flash Vendor', href: '/dashboard/swift-vendor', icon: Globe },
  { label: 'Agent Leaderboard', href: '/dashboard/leaderboard', icon: Trophy },
]

export const dashboardPageLabels: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/overview': 'Overview',
  '/dashboard/profile': 'My Profile',
  '/dashboard/account-settings': 'Account & Security',
  '/dashboard/settings': 'Account & Security',
  '/dashboard/wallet': 'Account Balance',
  '/dashboard/schedule': 'Auto-Renewal',
  '/dashboard/transactions': 'Transactions',
  '/dashboard/notifications': 'Inbox Notifications',
  '/dashboard/buy-data': 'Buy Data',
  '/dashboard/buy-airtime': 'Buy Airtime',
  '/dashboard/utilities': 'Other Services',
  '/dashboard/afa': 'AFA Registration',
  '/dashboard/my-store': 'My Store',
  '/dashboard/report-issue': 'Report Issue',
  '/dashboard/customers': 'Address Book',
  '/dashboard/address-book': 'Address Book',
  '/dashboard/referral': 'Referral Program',
  '/dashboard/agent-prices': 'Agent Prices',
  '/dashboard/pricing': 'Agent Prices',
  '/dashboard/store-packages': 'Agent Prices',
  '/dashboard/withdrawals': 'Withdrawals',
  '/dashboard/withdrawal': 'Withdrawals',
  '/dashboard/store-settings': 'Store Settings',
  '/dashboard/subagents': 'Subagents',
  '/dashboard/subagent-pricing': 'Subagent Pricing',
  '/dashboard/subagent-orders': 'Subagent Orders',
  '/dashboard/flyer': 'Flyer Generator',
  '/dashboard/marketing': 'Marketing Tools',
  '/dashboard/result-checker': 'Result Checker',
  '/dashboard/api': 'My API Access',
  '/dashboard/developer-api': 'My API Access',
  '/dashboard/agent-dev-hub': 'Agent Developer Hub',
  '/dashboard/bulk': 'Bulk Disbursement',
  '/dashboard/whatsapp-bot': 'WhatsApp Bot',
  '/dashboard/swift-vendor': 'Flash Vendor',
  '/dashboard/leaderboard': 'Agent Leaderboard',
  '/dashboard/store-orders': 'Orders',
  '/dashboard/store-transactions': 'Payments',
  '/dashboard/contact-support': 'Get Help',
  '/dashboard/buy-services': 'Buy Other Services',
  '/dashboard/other-services': 'Store Service Pricing',
}

export function resolveDashboardPageTitle(pathname: string): string {
  if (dashboardPageLabels[pathname]) {
    return dashboardPageLabels[pathname]
  }

  if (pathname.startsWith('/dashboard/buy-data')) {
    return 'Buy Data'
  }

  const matched = Object.keys(dashboardPageLabels)
    .filter((key) => key !== '/dashboard' && pathname.startsWith(key))
    .sort((a, b) => b.length - a.length)[0]

  return matched ? dashboardPageLabels[matched] : 'Dashboard'
}

export function isDashboardNavActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') {
    return pathname === '/dashboard' || pathname === '/dashboard/overview'
  }

  if (href.startsWith('/dashboard/buy-data')) {
    return pathname.startsWith('/dashboard/buy-data')
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}
