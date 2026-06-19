'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  Wifi,
  Wallet,
  Phone,
  Zap,
} from 'lucide-react'
import {
  DashboardPageShell,
  DashboardPanel,
} from '@/components/dashboard/page-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTransactionStore } from '@/lib/store'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const ITEMS_PER_PAGE = 10

const networkLogos: Record<string, { bg: string; text: string }> = {
  MTN: { bg: 'bg-yellow-500', text: 'text-black' },
  'Airtel-Tigo': { bg: 'bg-red-500', text: 'text-white' },
  Telecel: { bg: 'bg-blue-600', text: 'text-white' },
  'MTN AFA': { bg: 'bg-green-600', text: 'text-white' },
}

export default function TransactionsPage() {
  const { transactions } = useTransactionStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.phone?.includes(searchQuery)
    const matchesStatus = filterStatus === 'all' || tx.status === filterStatus
    const matchesType = filterType === 'all' || tx.type === filterType
    return matchesSearch && matchesStatus && matchesType
  })

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE)
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const handleExport = () => {
    toast.success('Transactions exported to CSV!')
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'data':
        return <Wifi className="h-4 w-4" />
      case 'airtime':
        return <Phone className="h-4 w-4" />
      case 'wallet':
        return <Wallet className="h-4 w-4" />
      case 'bill':
        return <Zap className="h-4 w-4" />
      default:
        return <Wallet className="h-4 w-4" />
    }
  }

  return (
    <DashboardPageShell
      title="Activity History"
      description="See all payments, purchases, and wallet updates in one place."
      actions={
        <Button variant="outline" className="gap-2" onClick={handleExport}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      }
    >
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <DashboardPanel>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by description, reference, or phone..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={filterStatus}
                onValueChange={(value) => {
                  setFilterStatus(value)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="w-32">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filterType}
                onValueChange={(value) => {
                  setFilterType(value)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="data">Data</SelectItem>
                  <SelectItem value="airtime">Airtime</SelectItem>
                  <SelectItem value="wallet">Wallet</SelectItem>
                  <SelectItem value="bill">Bills</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
      </DashboardPanel>

      <DashboardPanel title={`All Transactions (${filteredTransactions.length})`}>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-white/5">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-white/45">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Reference
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Phone
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    paginatedTransactions.map((tx) => (
                      <tr
                        key={tx.id}
                        className="border-b border-gray-50 transition-colors hover:bg-gray-50 dark:border-white/[0.03] dark:hover:bg-white/[0.02]"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {tx.network ? (
                              <div
                                className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                                  networkLogos[tx.network]?.bg || 'bg-primary'
                                } ${networkLogos[tx.network]?.text || 'text-primary-foreground'}`}
                              >
                                {tx.network.slice(0, 3)}
                              </div>
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                {getTypeIcon(tx.type)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 dark:text-white">{tx.description}</p>
                        </td>
                        <td className="px-4 py-3">
                          <code className="rounded bg-muted px-2 py-1 text-xs">
                            {tx.reference}
                          </code>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {tx.phone || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`font-semibold ${
                              tx.type === 'wallet'
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-foreground'
                            }`}
                          >
                            {tx.type === 'wallet' ? '+' : '-'}GH₵ {tx.amount.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="secondary"
                            className={
                              tx.status === 'success'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : tx.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }
                          >
                            {tx.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {format(new Date(tx.date), 'MMM d, yyyy')}
                          <br />
                          <span className="text-xs">
                            {format(new Date(tx.date), 'h:mm a')}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="space-y-3 md:hidden">
            {paginatedTransactions.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No transactions found
              </div>
            ) : (
              paginatedTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="rounded-lg border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#0a0a0f]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {tx.network ? (
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-lg text-xs font-bold ${
                            networkLogos[tx.network]?.bg || 'bg-primary'
                          } ${networkLogos[tx.network]?.text || 'text-primary-foreground'}`}
                        >
                          {tx.network.slice(0, 3)}
                        </div>
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          {getTypeIcon(tx.type)}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-foreground">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">{tx.reference}</p>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        tx.status === 'success'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : tx.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }
                    >
                      {tx.status}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(tx.date), 'MMM d, yyyy · h:mm a')}
                    </span>
                    <span
                      className={`font-semibold ${
                        tx.type === 'wallet'
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-foreground'
                      }`}
                    >
                      {tx.type === 'wallet' ? '+' : '-'}GH₵ {tx.amount.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-white/5">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredTransactions.length)} of{' '}
                {filteredTransactions.length} transactions
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
      </DashboardPanel>
    </motion.div>
    </DashboardPageShell>
  )
}
