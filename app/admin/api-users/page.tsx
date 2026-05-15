'use client'

import { useEffect, useState } from 'react'
import { KeyRound, Ban, Copy, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase/client'
import { formatDateTime, generateApiKey } from '@/lib/admin/utils'
import toast from 'react-hot-toast'

type ApiUserRow = {
  id: string
  user_id: string
  api_key: string
  usage_limit: number
  usage_count: number
  is_active: boolean
  created_at: string
  profiles?: { full_name: string | null; phone: string | null } | null
}

type ProfileOption = {
  id: string
  full_name: string | null
  phone: string | null
}

export default function AdminApiUsersPage() {
  const [rows, setRows] = useState<ApiUserRow[]>([])
  const [users, setUsers] = useState<ProfileOption[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [usageLimit, setUsageLimit] = useState('1000')

  const loadData = async () => {
    setLoading(true)

    const [apiRes, userRes] = await Promise.all([
      supabase.client
        .from('api_users')
        .select('id,user_id,api_key,usage_limit,usage_count,is_active,created_at,profiles(full_name,phone)')
        .order('created_at', { ascending: false }),
      supabase.client.from('profiles').select('id,full_name,phone').order('created_at', { ascending: false }),
    ])

    if (apiRes.error) {
      toast.error(apiRes.error.message)
      setLoading(false)
      return
    }

    if (userRes.error) {
      toast.error(userRes.error.message)
      setLoading(false)
      return
    }

    setRows((apiRes.data as ApiUserRow[]) || [])
    setUsers((userRes.data as ProfileOption[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    void loadData()
  }, [])

  const createApiUser = async (e: React.FormEvent) => {
    e.preventDefault()

    const parsedLimit = Number(usageLimit)
    if (!selectedUserId || Number.isNaN(parsedLimit) || parsedLimit < 0) {
      toast.error('Select user and enter a valid limit')
      return
    }

    setCreating(true)

    const { error } = await supabase.client.from('api_users').insert({
      user_id: selectedUserId,
      api_key: generateApiKey(),
      usage_limit: parsedLimit,
      usage_count: 0,
      is_active: true,
    })

    if (error) {
      toast.error(error.message)
      setCreating(false)
      return
    }

    toast.success('API user created')
    setSelectedUserId('')
    setUsageLimit('1000')
    setCreating(false)
    void loadData()
  }

  const revokeKey = async (row: ApiUserRow) => {
    const { error } = await supabase.client.from('api_users').update({ is_active: false }).eq('id', row.id)
    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Key revoked')
    void loadData()
  }

  const regenerateKey = async (row: ApiUserRow) => {
    const { error } = await supabase.client
      .from('api_users')
      .update({ api_key: generateApiKey(), is_active: true })
      .eq('id', row.id)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('API key regenerated')
    void loadData()
  }

  const copyKey = async (key: string) => {
    await navigator.clipboard.writeText(key)
    toast.success('API key copied')
  }

  const alreadyAssigned = new Set(rows.map((r) => r.user_id))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">API Users</h1>
        <p className="text-sm text-muted-foreground">Generate, revoke, and monitor API key usage.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create API User</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createApiUser} className="grid gap-3 md:grid-cols-[1fr_180px_auto] items-end">
            <div className="space-y-2">
              <Label>User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter((u) => !alreadyAssigned.has(u.id))
                    .map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {(user.full_name || 'Unnamed User') + (user.phone ? ` (${user.phone})` : '')}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Usage Limit</Label>
              <Input type="number" min="0" value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} className="h-11" />
            </div>
            <Button type="submit" disabled={creating} className="h-11">
              <Plus className="mr-2 h-4 w-4" /> {creating ? 'Creating...' : 'Create'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Access Records</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="bg-muted/60 text-left">
              <tr>
                <th className="px-3 py-3">User</th>
                <th className="px-3 py-3">API Key</th>
                <th className="px-3 py-3">Usage</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Created</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-3 py-6 text-muted-foreground" colSpan={6}>Loading API users...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className="px-3 py-6 text-muted-foreground" colSpan={6}>No API users found.</td></tr>
              ) : rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-3 py-3">
                    <p className="font-medium">{row.profiles?.full_name || '-'}</p>
                    <p className="text-xs text-muted-foreground">{row.profiles?.phone || '-'}</p>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs">
                    <div className="flex items-center gap-2">
                      <span>{row.api_key.slice(0, 18)}...</span>
                      <Button size="icon" variant="ghost" onClick={() => void copyKey(row.api_key)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                  <td className="px-3 py-3">{row.usage_count} / {row.usage_limit}</td>
                  <td className="px-3 py-3">
                    <Badge variant={row.is_active ? 'default' : 'destructive'}>{row.is_active ? 'Active' : 'Revoked'}</Badge>
                  </td>
                  <td className="px-3 py-3">{formatDateTime(row.created_at)}</td>
                  <td className="px-3 py-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => void regenerateKey(row)}>
                        <KeyRound className="mr-1 h-3.5 w-3.5" /> Regenerate
                      </Button>
                      {row.is_active && (
                        <Button size="sm" variant="destructive" onClick={() => void revokeKey(row)}>
                          <Ban className="mr-1 h-3.5 w-3.5" /> Revoke
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
