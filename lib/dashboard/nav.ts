import {
  Home,
  Wallet,
  Wifi,
  Phone,
  Receipt,
  Store,
  Settings,
  Code2,
  HeadphonesIcon,
  Users,
  Share2,
  Trophy,
  Megaphone,
  ImageIcon,
  Layers,
  ClipboardCheck,
  Calendar,
  MessageCircle,
  Globe,
  Bell,
  User,
  AlertCircle,
  Sparkles,
  BookUser,
  RefreshCw,
  Zap,
  Tag,
  type LucideIcon,
} from 'lucide-react'

export type DashboardNavItem = {
  label: string
  href: string
  icon: LucideIcon
  badge?: string
  children?: { label: string; href: string }[]
}

export type DashboardNavSection = {
  title: string
  items: DashboardNavItem[]
}

export const dashboardNavSections: DashboardNavSection[] = [
  {
    title: 'Overview',
    items: [{ label: 'Overview', href: '/dashboard/overview', icon: Home }],
  },
  {
    title: 'Main',
    items: [
      { label: 'My Profile', href: '/dashboard/profile', icon: User },
      { label: 'Account & Security', href: '/dashboard/settings', icon: Settings },
      { label: 'Account Balance', href: '/dashboard/wallet', icon: Wallet },
      { label: 'Auto-Renewal', href: '/dashboard/schedule', icon: RefreshCw },
      { label: 'Transactions', href: '/dashboard/transactions', icon: Receipt },
      { label: 'Inbox Notifications', href: '/dashboard/notifications', icon: Bell },
    ],
  },
  {
    title: 'Operations',
    items: [
      {
        label: 'Buy Data',
        href: '/dashboard/buy-data',
        icon: Wifi,
        children: [
          { label: 'MTN', href: '/dashboard/buy-data?network=mtn' },
          { label: 'Airtel-Tigo', href: '/dashboard/buy-data?network=airtel-tigo' },
          { label: 'Telecel', href: '/dashboard/buy-data?network=telecel' },
        ],
      },
      { label: 'Buy Airtime', href: '/dashboard/buy-airtime', icon: Phone },
      { label: 'Utility Bills', href: '/dashboard/utilities', icon: Zap },
      { label: 'AFA Registration', href: '/dashboard/afa', icon: Sparkles },
      { label: 'My Store', href: '/dashboard/my-store', icon: Store },
      { label: 'Report Issue', href: '/dashboard/report-issue', icon: AlertCircle },
      { label: 'Address Book', href: '/dashboard/address-book', icon: BookUser },
      { label: 'Referral Program', href: '/dashboard/referral', icon: Share2 },
      { label: 'Agent Prices', href: '/dashboard/pricing', icon: Tag },
      { label: 'Withdrawals', href: '/dashboard/withdrawal', icon: Wallet },
      { label: 'Store Settings', href: '/dashboard/store-settings', icon: Settings },
    ],
  },
  {
    title: 'Grow',
    items: [
      { label: 'Subagents', href: '/dashboard/subagents', icon: Users, badge: 'New' },
      { label: 'Subagent Pricing', href: '/dashboard/subagent-pricing', icon: Tag },
      { label: 'Flyer Generator', href: '/dashboard/flyer', icon: ImageIcon },
      { label: 'Marketing Tools', href: '/dashboard/marketing', icon: Megaphone },
      { label: 'Result Checker', href: '/dashboard/result-checker', icon: ClipboardCheck },
    ],
  },
  {
    title: 'Tools',
    items: [
      { label: 'My API Access', href: '/dashboard/developer-api', icon: Code2 },
      { label: 'Agent Developer Hub', href: '/dashboard/agent-dev-hub', icon: Globe },
      { label: 'Bulk Disbursement', href: '/dashboard/bulk', icon: Layers },
      { label: 'WhatsApp Bot', href: '/dashboard/whatsapp-bot', icon: MessageCircle },
      { label: 'Flash Vendor', href: '/dashboard/swift-vendor', icon: Globe },
      { label: 'Agent Leaderboard', href: '/dashboard/leaderboard', icon: Trophy },
    ],
  },
  {
    title: 'Support',
    items: [{ label: 'Get Help', href: '/dashboard/contact-support', icon: HeadphonesIcon }],
  },
]

export const dashboardPageLabels: Record<string, string> = {
  '/dashboard/overview': 'Overview',
  '/dashboard/profile': 'My Profile',
  '/dashboard/settings': 'Account & Security',
  '/dashboard/wallet': 'Account Balance',
  '/dashboard/schedule': 'Auto-Renewal',
  '/dashboard/transactions': 'Transactions',
  '/dashboard/notifications': 'Inbox Notifications',
  '/dashboard/buy-data': 'Buy Data',
  '/dashboard/buy-airtime': 'Buy Airtime',
  '/dashboard/utilities': 'Utility Bills',
  '/dashboard/afa': 'AFA Registration',
  '/dashboard/my-store': 'My Store',
  '/dashboard/report-issue': 'Report Issue',
  '/dashboard/address-book': 'Address Book',
  '/dashboard/referral': 'Referral Program',
  '/dashboard/pricing': 'Agent Prices',
  '/dashboard/store-packages': 'Agent Prices',
  '/dashboard/withdrawal': 'Withdrawals',
  '/dashboard/store-settings': 'Store Settings',
  '/dashboard/subagents': 'Subagents',
  '/dashboard/subagent-pricing': 'Subagent Pricing',
  '/dashboard/flyer': 'Flyer Generator',
  '/dashboard/marketing': 'Marketing Tools',
  '/dashboard/result-checker': 'Result Checker',
  '/dashboard/developer-api': 'My API Access',
  '/dashboard/agent-dev-hub': 'Agent Developer Hub',
  '/dashboard/bulk': 'Bulk Disbursement',
  '/dashboard/whatsapp-bot': 'WhatsApp Bot',
  '/dashboard/swift-vendor': 'Flash Vendor',
  '/dashboard/leaderboard': 'Agent Leaderboard',
  '/dashboard/store-orders': 'Orders',
  '/dashboard/store-transactions': 'Payments',
  '/dashboard/customers': 'Customers',
  '/dashboard/contact-support': 'Get Help',
  '/dashboard/buy-services': 'Utility Bills',
  '/dashboard/other-services': 'Utility Bills',
}
