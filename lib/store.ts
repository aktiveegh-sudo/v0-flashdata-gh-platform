import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  name: string
  email: string
  phone: string
  avatar?: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'flashdata-auth',
    }
  )
)

type ThemeMode = 'light' | 'dark'
type AccentColor = 'default' | 'blue' | 'orange' | 'purple'

interface ThemeState {
  mode: ThemeMode
  accent: AccentColor
  setMode: (mode: ThemeMode) => void
  setAccent: (accent: AccentColor) => void
  toggleMode: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'light',
      accent: 'default',
      setMode: (mode) => set({ mode }),
      setAccent: (accent) => set({ accent }),
      toggleMode: () => set((state) => ({ mode: state.mode === 'light' ? 'dark' : 'light' })),
    }),
    {
      name: 'flashdata-theme',
    }
  )
)

interface WalletState {
  balance: number
  addFunds: (amount: number) => void
  deductFunds: (amount: number) => boolean
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      balance: 248.75,
      addFunds: (amount) => set((state) => ({ balance: state.balance + amount })),
      deductFunds: (amount) => {
        const currentBalance = get().balance
        if (currentBalance >= amount) {
          set({ balance: currentBalance - amount })
          return true
        }
        return false
      },
    }),
    {
      name: 'flashdata-wallet',
    }
  )
)

export interface Transaction {
  id: string
  type: 'data' | 'airtime' | 'wallet' | 'withdrawal' | 'bill'
  network?: string
  amount: number
  phone?: string
  status: 'success' | 'pending' | 'failed'
  reference: string
  date: string
  description: string
}

interface TransactionState {
  transactions: Transaction[]
  addTransaction: (transaction: Omit<Transaction, 'id' | 'date'>) => void
}

const initialTransactions: Transaction[] = [
  {
    id: '1',
    type: 'data',
    network: 'MTN',
    amount: 10.00,
    phone: '0241234567',
    status: 'success',
    reference: 'FD-MTN-001234',
    date: '2024-01-15T10:30:00',
    description: '2GB MTN Data Bundle',
  },
  {
    id: '2',
    type: 'data',
    network: 'Airtel-Tigo',
    amount: 5.00,
    phone: '0261234567',
    status: 'success',
    reference: 'FD-AT-001235',
    date: '2024-01-14T14:20:00',
    description: '1GB Airtel-Tigo Data',
  },
  {
    id: '3',
    type: 'wallet',
    amount: 100.00,
    status: 'success',
    reference: 'FD-WAL-001236',
    date: '2024-01-13T09:00:00',
    description: 'Wallet Top-up via MTN MoMo',
  },
  {
    id: '4',
    type: 'data',
    network: 'Telecel',
    amount: 15.00,
    phone: '0201234567',
    status: 'pending',
    reference: 'FD-TEL-001237',
    date: '2024-01-12T16:45:00',
    description: '5GB Telecel Data Bundle',
  },
  {
    id: '5',
    type: 'airtime',
    network: 'MTN',
    amount: 20.00,
    phone: '0241234567',
    status: 'failed',
    reference: 'FD-AIR-001238',
    date: '2024-01-11T11:15:00',
    description: 'MTN Airtime Recharge',
  },
]

export const useTransactionStore = create<TransactionState>()(
  persist(
    (set) => ({
      transactions: initialTransactions,
      addTransaction: (transaction) =>
        set((state) => ({
          transactions: [
            {
              ...transaction,
              id: Math.random().toString(36).substring(2, 9),
              date: new Date().toISOString(),
            },
            ...state.transactions,
          ],
        })),
    }),
    {
      name: 'flashdata-transactions',
    }
  )
)

export interface StorePackage {
  id: string
  network: string
  dataAmount: string
  costPrice: number
  sellingPrice: number
  active: boolean
}

interface StoreState {
  packages: StorePackage[]
  addPackage: (pkg: Omit<StorePackage, 'id'>) => void
  updatePackage: (id: string, pkg: Partial<StorePackage>) => void
  deletePackage: (id: string) => void
}

const initialPackages: StorePackage[] = [
  { id: '1', network: 'MTN', dataAmount: '1GB', costPrice: 4.50, sellingPrice: 5.00, active: true },
  { id: '2', network: 'MTN', dataAmount: '2GB', costPrice: 8.50, sellingPrice: 10.00, active: true },
  { id: '3', network: 'MTN', dataAmount: '5GB', costPrice: 20.00, sellingPrice: 25.00, active: true },
  { id: '4', network: 'Airtel-Tigo', dataAmount: '1GB', costPrice: 4.00, sellingPrice: 5.00, active: true },
  { id: '5', network: 'Telecel', dataAmount: '2GB', costPrice: 7.50, sellingPrice: 9.00, active: false },
]

export const useStorePackageStore = create<StoreState>()(
  persist(
    (set) => ({
      packages: initialPackages,
      addPackage: (pkg) =>
        set((state) => ({
          packages: [
            ...state.packages,
            { ...pkg, id: Math.random().toString(36).substring(2, 9) },
          ],
        })),
      updatePackage: (id, updates) =>
        set((state) => ({
          packages: state.packages.map((pkg) =>
            pkg.id === id ? { ...pkg, ...updates } : pkg
          ),
        })),
      deletePackage: (id) =>
        set((state) => ({
          packages: state.packages.filter((pkg) => pkg.id !== id),
        })),
    }),
    {
      name: 'flashdata-store-packages',
    }
  )
)

export interface StoreOrder {
  id: string
  customerName: string
  customerPhone: string
  network: string
  dataAmount: string
  amount: number
  status: 'pending' | 'accepted' | 'declined' | 'completed'
  date: string
}

interface StoreOrderState {
  orders: StoreOrder[]
  updateOrderStatus: (id: string, status: StoreOrder['status']) => void
}

const initialOrders: StoreOrder[] = [
  { id: '1', customerName: 'Kwame Asante', customerPhone: '0241234567', network: 'MTN', dataAmount: '2GB', amount: 10.00, status: 'pending', date: '2024-01-15T10:30:00' },
  { id: '2', customerName: 'Ama Serwaa', customerPhone: '0261234567', network: 'Airtel-Tigo', dataAmount: '1GB', amount: 5.00, status: 'pending', date: '2024-01-15T09:15:00' },
  { id: '3', customerName: 'Kofi Mensah', customerPhone: '0201234567', network: 'Telecel', dataAmount: '5GB', amount: 25.00, status: 'completed', date: '2024-01-14T16:45:00' },
  { id: '4', customerName: 'Yaa Asantewaa', customerPhone: '0551234567', network: 'MTN', dataAmount: '1GB', amount: 5.00, status: 'accepted', date: '2024-01-14T14:20:00' },
]

export const useStoreOrderStore = create<StoreOrderState>()(
  persist(
    (set) => ({
      orders: initialOrders,
      updateOrderStatus: (id, status) =>
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === id ? { ...order, status } : order
          ),
        })),
    }),
    {
      name: 'flashdata-store-orders',
    }
  )
)

interface LoadingState {
  isLoading: boolean
  setLoading: (loading: boolean) => void
}

export const useLoadingStore = create<LoadingState>()((set) => ({
  isLoading: false,
  setLoading: (isLoading) => set({ isLoading }),
}))
