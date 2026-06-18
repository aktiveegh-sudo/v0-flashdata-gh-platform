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
  User,
  Store,
  PlusSquare,
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

export const adminNavSections: AdminNavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Overview', href: '/admin/overview', icon: LayoutDashboard },
      { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'Users & Agents',
    items: [
      { label: 'Users', href: '/admin/users', icon: Users },
      { label: 'Agents', href: '/admin/agents', icon: UserCog },
      { label: 'Sub-Agents', href: '/admin/sub-agents', icon: UsersRound },
      { label: 'Agent Performance', href: '/admin/agent-performance', icon: TrendingUp },
    ],
  },
  {
    title: 'Commerce',
    items: [
      { label: 'Orders', href: '/admin/orders', icon: ClipboardList },
      { label: 'Mash Up Orders', href: '/admin/mashup-orders', icon: Layers },
      { label: 'Packages', href: '/admin/packages', icon: Package },
      { label: 'Add Service', href: '/admin/add-service', icon: PlusSquare },
      { label: 'AFA Control', href: '/admin/afa', icon: Sparkles },
      { label: 'Withdrawals', href: '/admin/withdrawals', icon: Landmark },
      { label: 'Wallet Top-Up', href: '/admin/wallet-topup', icon: Wallet },
      { label: 'Credit Mgmt', href: '/admin/credit-management', icon: CreditCard },
      { label: 'Profits', href: '/admin/profits', icon: CircleDollarSign },
      { label: 'P&L', href: '/admin/pnl', icon: PieChart },
      { label: 'Reconciliation', href: '/admin/reconciliation', icon: Scale },
    ],
  },
  {
    title: 'API & Integrations',
    items: [
      { label: 'API Users', href: '/admin/api-users', icon: KeyRound },
      { label: 'API Orders', href: '/admin/api-orders', icon: Code2 },
      { label: 'API Network Intelligence', href: '/admin/api-network', icon: Globe },
      { label: 'Flash Vendor Master', href: '/admin/flash-vendor', icon: Store },
    ],
  },
  {
    title: 'Support & Users',
    items: [
      { label: 'Broadcast', href: '/admin/broadcast', icon: Radio },
      { label: 'Notifications', href: '/admin/notifications', icon: Bell },
      { label: 'Promo Banners', href: '/admin/banners', icon: ImageIcon },
      { label: 'Promo Codes', href: '/admin/promotions', icon: Ticket },
      { label: 'Engagement Hub', href: '/admin/engagement', icon: Megaphone },
      { label: 'SMS Templates', href: '/admin/sms-templates', icon: MessageSquare },
      { label: 'Support Tickets', href: '/admin/tickets', icon: HeadphonesIcon },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Settings', href: '/admin/settings', icon: Settings },
      { label: 'Security', href: '/admin/security', icon: ShieldCheck },
      { label: 'Audit Logs', href: '/admin/audit-logs', icon: ScrollText },
      { label: 'System Health', href: '/admin/system-health', icon: Activity },
      { label: 'System Logs', href: '/admin/system-logs', icon: FileText },
      { label: 'Feature Flags', href: '/admin/feature-flags', icon: Flag },
      { label: 'Sentinel AI', href: '/admin/sentinel', icon: Bot },
      { label: 'AI Strategy', href: '/admin/ai-strategy', icon: Sparkles },
      { label: 'Account Settings', href: '/admin/account-settings', icon: User },
    ],
  },
]

export const adminPageLabels: Record<string, string> = {
  '/admin/overview': 'Overview',
  '/admin/analytics': 'Analytics',
  '/admin/users': 'Users',
  '/admin/agents': 'Agents',
  '/admin/sub-agents': 'Sub-Agents',
  '/admin/agent-performance': 'Agent Performance',
  '/admin/orders': 'Orders',
  '/admin/mashup-orders': 'Mash Up Orders',
  '/admin/packages': 'Packages',
  '/admin/add-service': 'Add Service',
  '/admin/afa': 'AFA Control',
  '/admin/withdrawals': 'Withdrawals',
  '/admin/wallet-topup': 'Wallet Top-Up',
  '/admin/credit-management': 'Credit Mgmt',
  '/admin/profits': 'Profits',
  '/admin/pnl': 'P&L',
  '/admin/reconciliation': 'Reconciliation',
  '/admin/api-users': 'API Users',
  '/admin/api-orders': 'API Orders',
  '/admin/api-network': 'API Network Intelligence',
  '/admin/flash-vendor': 'Flash Vendor Master',
  '/admin/broadcast': 'Broadcast',
  '/admin/notifications': 'Notifications',
  '/admin/banners': 'Promo Banners',
  '/admin/promotions': 'Promo Codes',
  '/admin/engagement': 'Engagement Hub',
  '/admin/sms-templates': 'SMS Templates',
  '/admin/tickets': 'Support Tickets',
  '/admin/settings': 'Settings',
  '/admin/site-settings': 'Settings',
  '/admin/security': 'Security',
  '/admin/audit-logs': 'Audit Logs',
  '/admin/system-health': 'System Health',
  '/admin/system-logs': 'System Logs',
  '/admin/feature-flags': 'Feature Flags',
  '/admin/sentinel': 'Sentinel AI',
  '/admin/ai-strategy': 'AI Strategy',
  '/admin/account-settings': 'Account Settings',
  '/admin/send-notification': 'Broadcast',
}
