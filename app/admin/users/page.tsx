'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, Trash2, UserMinus, UserCheck, Wallet, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase/client'
import { formatDateTime, ghanaCurrency } from '@/lib/admin/utils'
import type { ProfileRow } from '@/lib/admin/types'
import toast from 'react-hot-toast'

const PAGE_SIZE = 10

export default function AdminUsersPage() {
  const [rows, setRows] = useState<ProfileRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'super_admin'>('all')
  const [selected, setSelected] = useState<string[]>([])
  const [page, setPage] = useState(1)

  const loadUsers = async () => {
    setLoading(true)
    const { data, error } = await supabase.client
      .from('profiles')
      .select('id,full_name,phone,email,role,status,avatar_url,created_at,wallets(balance)')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    setRows((data as ProfileRow[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    void loadUsers()

    const channel = supabase.client
      .channel('admin-users-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => void loadUsers())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets' }, () => void loadUsers())
      .subscribe()

    return () => {
      void supabase.client.removeChannel(channel)
    }
  }, [])

  const filtered = useMemo(() => {
    const term = search.toLowerCase()

    return rows.filter((row) => {
      const roleOk = roleFilter === 'all' || row.role === roleFilter
      const textOk =
        (row.full_name || '').toLowerCase().includes(term) ||
        (row.email || '').toLowerCase().includes(term) ||
        (row.phone || '').toLowerCase().includes(term)

      return roleOk && textOk
    })
  }, [rows, search, roleFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const toggleSelection = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const toggleSelectAll = () => {
    if (selected.length === paginated.length) {
      setSelected([])
      return
    }

    setSelected(paginated.map((item) => item.id))
  }

  const updateWallet = async (userId: string) => {
    const amountRaw = window.prompt('Enter new wallet balance (GHS)')
    if (!amountRaw) {
      return
    }

    const amount = Number(amountRaw)
    if (Number.isNaN(amount) || amount < 0) {
      toast.error('Invalid amount')
      return
    }

    const { error } = await supabase.client
      .from('wallets')
      .update({ balance: amount, last_updated: new Date().toISOString() })
      .eq('user_id', userId)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Wallet updated')
    void loadUsers()
  }

  const changeStatus = async (ids: string[], status: 'active' | 'suspended') => {
    const { error } = await supabase.client.from('profiles').update({ status }).in('id', ids)
    if (error) {
      toast.error(error.message)
      return
    }

    toast.success(`Updated ${ids.length} user(s)`) 
    setSelected([])
    void loadUsers()
  }

  const deleteUsers = async (ids: string[]) => {
    if (!window.confirm(`Delete ${ids.length} user(s)? This cannot be undone.`)) {
      return
    }

    const { error } = await supabase.client.from('profiles').delete().in('id', ids)
    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Users deleted')
    setSelected([])
    void loadUsers()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">Search, filter, and manage all platform users.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 pl-10"
              placeholder="Search by name, email or phone"
            />
          </div>

          <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as typeof roleFilter)}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="user">Users</SelectItem>
              <SelectItem value="super_admin">Super Admins</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selected.length > 0 && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 p-4">
            <p className="text-sm font-medium">{selected.length} selected</p>
            <Button size="sm" variant="outline" onClick={() => void changeStatus(selected, 'active')}>
              <UserCheck className="mr-2 h-4 w-4" /> Activate
            </Button>
            <Button size="sm" variant="outline" onClick={() => void changeStatus(selected, 'suspended')}>
              <UserMinus className="mr-2 h-4 w-4" /> Suspend
            </Button>
            <Button size="sm" variant="destructive" onClick={() => void deleteUsers(selected)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-muted/60 text-left">
              <tr>
                <th className="px-3 py-3">
                  <Checkbox checked={selected.length === paginated.length && paginated.length > 0} onCheckedChange={toggleSelectAll} />
                </th>
                <th className="px-3 py-3">Name</th>
                <th className="px-3 py-3">Phone</th>
                <th className="px-3 py-3">Email</th>
                <th className="px-3 py-3">Wallet Balance</th>
                <th className="px-3 py-3">Role</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Joined</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-3 py-6 text-muted-foreground" colSpan={9}>Loading users...</td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-muted-foreground" colSpan={9}>No users found.</td>
                </tr>
              ) : (
                paginated.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-3 py-3">
                      <Checkbox checked={selected.includes(row.id)} onCheckedChange={() => toggleSelection(row.id)} />
                    </td>
                    <td className="px-3 py-3 font-medium">{row.full_name || '-'}</td>
                    <td className="px-3 py-3">{row.phone || '-'}</td>
                    <td className="px-3 py-3">{row.email || '-'}</td>
                    <td className="px-3 py-3">{ghanaCurrency(Number(row.wallets?.[0]?.balance || 0))}</td>
                    <td className="px-3 py-3"><Badge variant="outline">{row.role}</Badge></td>
                    <td className="px-3 py-3">
                      <Badge variant={row.status === 'active' ? 'default' : 'destructive'}>{row.status}</Badge>
                    </td>
                    <td className="px-3 py-3">{formatDateTime(row.created_at)}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => updateWallet(row.id)}>
                          <Wallet className="mr-1 h-3.5 w-3.5" /> Wallet
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void changeStatus([row.id], row.status === 'active' ? 'suspended' : 'active')}
                        >
                          {row.status === 'active' ? <UserMinus className="mr-1 h-3.5 w-3.5" /> : <UserCheck className="mr-1 h-3.5 w-3.5" />}
                          {row.status === 'active' ? 'Suspend' : 'Activate'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => window.alert(JSON.stringify(row, null, 2))}>
                          <Eye className="mr-1 h-3.5 w-3.5" /> Details
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => void deleteUsers([row.id])}>
                          <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Badge variant="outline">Page {page} / {totalPages}</Badge>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
