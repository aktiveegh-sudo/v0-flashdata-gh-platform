export const networks = [
  { id: "mtn", name: "MTN", color: "#FFCC00" },
  { id: "vodafone", name: "Vodafone", color: "#E60000" },
  { id: "airteltigo", name: "AirtelTigo", color: "#FF0000" },
  { id: "glo", name: "Glo", color: "#00A651" }
]

export const dataPackages = {
  mtn: [
    { id: "mtn-1", name: "Daily Bundle", data: "500MB", price: 2.00, validity: "1 Day" },
    { id: "mtn-2", name: "Daily Bundle", data: "1GB", price: 3.50, validity: "1 Day" },
    { id: "mtn-3", name: "Weekly Bundle", data: "2GB", price: 8.00, validity: "7 Days", isPopular: true },
    { id: "mtn-4", name: "Weekly Bundle", data: "5GB", price: 18.00, validity: "7 Days" },
    { id: "mtn-5", name: "Monthly Bundle", data: "10GB", price: 35.00, validity: "30 Days", isPopular: true },
    { id: "mtn-6", name: "Monthly Bundle", data: "25GB", price: 75.00, validity: "30 Days" },
    { id: "mtn-7", name: "Monthly Bundle", data: "50GB", price: 120.00, validity: "30 Days" },
    { id: "mtn-8", name: "Unlimited", data: "Unlimited", price: 200.00, validity: "30 Days" }
  ],
  vodafone: [
    { id: "vf-1", name: "Daily", data: "500MB", price: 2.50, validity: "1 Day" },
    { id: "vf-2", name: "Daily", data: "1GB", price: 4.00, validity: "1 Day" },
    { id: "vf-3", name: "Weekly", data: "3GB", price: 10.00, validity: "7 Days", isPopular: true },
    { id: "vf-4", name: "Monthly", data: "8GB", price: 30.00, validity: "30 Days" },
    { id: "vf-5", name: "Monthly", data: "15GB", price: 50.00, validity: "30 Days", isPopular: true },
    { id: "vf-6", name: "Monthly", data: "30GB", price: 85.00, validity: "30 Days" }
  ],
  airteltigo: [
    { id: "at-1", name: "Flexi", data: "750MB", price: 3.00, validity: "3 Days" },
    { id: "at-2", name: "Weekly", data: "2GB", price: 7.50, validity: "7 Days", isPopular: true },
    { id: "at-3", name: "Monthly", data: "6GB", price: 25.00, validity: "30 Days" },
    { id: "at-4", name: "Monthly", data: "12GB", price: 45.00, validity: "30 Days", isPopular: true },
    { id: "at-5", name: "Monthly", data: "20GB", price: 65.00, validity: "30 Days" }
  ],
  glo: [
    { id: "glo-1", name: "Daily", data: "1GB", price: 3.00, validity: "1 Day" },
    { id: "glo-2", name: "Weekly", data: "4GB", price: 12.00, validity: "7 Days", isPopular: true },
    { id: "glo-3", name: "Monthly", data: "10GB", price: 35.00, validity: "30 Days" },
    { id: "glo-4", name: "Monthly", data: "18GB", price: 55.00, validity: "30 Days", isPopular: true }
  ]
}

export const storePackages = {
  mtn: [
    { id: "sp-mtn-1", name: "Reseller 1GB", data: "1GB", price: 3.00, sellingPrice: 3.50, validity: "30 Days", profit: 0.50 },
    { id: "sp-mtn-2", name: "Reseller 2GB", data: "2GB", price: 5.50, sellingPrice: 7.00, validity: "30 Days", profit: 1.50 },
    { id: "sp-mtn-3", name: "Reseller 5GB", data: "5GB", price: 15.00, sellingPrice: 18.00, validity: "30 Days", profit: 3.00, isPopular: true },
    { id: "sp-mtn-4", name: "Reseller 10GB", data: "10GB", price: 30.00, sellingPrice: 35.00, validity: "30 Days", profit: 5.00 },
    { id: "sp-mtn-5", name: "Reseller 20GB", data: "20GB", price: 55.00, sellingPrice: 65.00, validity: "30 Days", profit: 10.00, isPopular: true },
    { id: "sp-mtn-6", name: "Reseller 50GB", data: "50GB", price: 100.00, sellingPrice: 120.00, validity: "30 Days", profit: 20.00 }
  ],
  vodafone: [
    { id: "sp-vf-1", name: "Reseller 1GB", data: "1GB", price: 3.50, sellingPrice: 4.00, validity: "30 Days", profit: 0.50 },
    { id: "sp-vf-2", name: "Reseller 3GB", data: "3GB", price: 8.50, sellingPrice: 10.00, validity: "30 Days", profit: 1.50 },
    { id: "sp-vf-3", name: "Reseller 8GB", data: "8GB", price: 26.00, sellingPrice: 30.00, validity: "30 Days", profit: 4.00, isPopular: true },
    { id: "sp-vf-4", name: "Reseller 15GB", data: "15GB", price: 45.00, sellingPrice: 50.00, validity: "30 Days", profit: 5.00 }
  ],
  airteltigo: [
    { id: "sp-at-1", name: "Reseller 2GB", data: "2GB", price: 6.50, sellingPrice: 7.50, validity: "30 Days", profit: 1.00 },
    { id: "sp-at-2", name: "Reseller 6GB", data: "6GB", price: 22.00, sellingPrice: 25.00, validity: "30 Days", profit: 3.00, isPopular: true },
    { id: "sp-at-3", name: "Reseller 12GB", data: "12GB", price: 40.00, sellingPrice: 45.00, validity: "30 Days", profit: 5.00 }
  ],
  glo: [
    { id: "sp-glo-1", name: "Reseller 4GB", data: "4GB", price: 10.00, sellingPrice: 12.00, validity: "30 Days", profit: 2.00, isPopular: true },
    { id: "sp-glo-2", name: "Reseller 10GB", data: "10GB", price: 30.00, sellingPrice: 35.00, validity: "30 Days", profit: 5.00 }
  ]
}

export const otherServices = [
  {
    id: "electricity",
    name: "Electricity",
    description: "Pay your electricity bills",
    icon: "Zap",
    providers: ["ECG", "NEDCO", "VRA"]
  },
  {
    id: "tv",
    name: "TV Subscription",
    description: "Renew your TV subscription",
    icon: "Tv",
    providers: ["GOtv", "DStv", "StarTimes"]
  },
  {
    id: "internet",
    name: "Internet",
    description: "Pay for broadband internet",
    icon: "Globe",
    providers: ["Vodafone Broadband", "MTN Fibre", "Busy Internet"]
  },
  {
    id: "education",
    name: "Education",
    description: "Pay school fees and buy e-learning pins",
    icon: "GraduationCap",
    providers: ["WAEC", "BECE", "University Fees"]
  }
]

export const transactions = [
  {
    id: "txn-001",
    type: "data" as const,
    title: "MTN Data Bundle",
    description: "10GB Monthly - 0241234567",
    amount: 35.00,
    status: "completed" as const,
    date: "Today, 2:30 PM",
    isCredit: false
  },
  {
    id: "txn-002",
    type: "deposit" as const,
    title: "Wallet Funding",
    description: "Mobile Money Deposit",
    amount: 100.00,
    status: "completed" as const,
    date: "Today, 10:15 AM",
    isCredit: true
  },
  {
    id: "txn-003",
    type: "airtime" as const,
    title: "Vodafone Airtime",
    description: "0201234567",
    amount: 20.00,
    status: "completed" as const,
    date: "Yesterday, 5:45 PM",
    isCredit: false
  },
  {
    id: "txn-004",
    type: "electricity" as const,
    title: "ECG Prepaid",
    description: "Meter: 04123456789",
    amount: 50.00,
    status: "pending" as const,
    date: "Yesterday, 3:20 PM",
    isCredit: false
  },
  {
    id: "txn-005",
    type: "withdrawal" as const,
    title: "Withdrawal",
    description: "To Mobile Money",
    amount: 75.00,
    status: "completed" as const,
    date: "Dec 10, 2024",
    isCredit: false
  }
]

export const paymentMethods = [
  { id: "momo-mtn", name: "MTN Mobile Money", icon: "Smartphone", color: "#FFCC00" },
  { id: "momo-voda", name: "Vodafone Cash", icon: "Smartphone", color: "#E60000" },
  { id: "momo-at", name: "AirtelTigo Money", icon: "Smartphone", color: "#FF0000" },
  { id: "card", name: "Debit/Credit Card", icon: "CreditCard", color: "#6366F1" },
  { id: "bank", name: "Bank Transfer", icon: "Building2", color: "#10B981" }
]
