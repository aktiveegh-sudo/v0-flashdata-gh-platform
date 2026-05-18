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
  setAuthUser: (user: User) => void
  clearAuth: () => void
  login: (user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setAuthUser: (user) => set({ user, isAuthenticated: true }),
      clearAuth: () => set({ user: null, isAuthenticated: false }),
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
      balance: 0,
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
      name: 'flashdata-wallet-v2',
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

const initialTransactions: Transaction[] = []

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
      name: 'flashdata-transactions-v2',
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

const initialPackages: StorePackage[] = []

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
      name: 'flashdata-store-packages-v2',
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

const initialOrders: StoreOrder[] = []

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
      name: 'flashdata-store-orders-v2',
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
