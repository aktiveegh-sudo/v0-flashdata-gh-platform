'use client'

import { useEffect, useMemo, useState } from 'react'
import { Users, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase/client'
import { formatDateTime, ghanaCurrency } from '@/lib/admin/utils'
import toast from 'react-hot-toast'

type UserRow = {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  role: 'user' | 'super_admin'
  status: 'active' | 'suspended'
  avatar_url: string | null
  created_at: string
  wallet_balance: number
}

export default function AdminUsersPage() {
	const [loading, setLoading] = useState(true)
	const [users, setUsers] = useState<UserRow[]>([])
	const [search, setSearch] = useState('')
	const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all')
	const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'super_admin'>('all')

	const loadUsers = async () => {
		setLoading(true)

		const syncRes = await supabase.client.rpc('sync_auth_users_to_profiles_wallets')
		if (syncRes.error) {
			toast.error(syncRes.error.message)
			setLoading(false)
			return
		}

		const listRes = await supabase.client.rpc('admin_list_users')
		if (listRes.error) {
			toast.error(listRes.error.message)
			setLoading(false)
			return
		}

		setUsers(
			((listRes.data as UserRow[] | null) || []).map((row) => ({
				...row,
				wallet_balance: Number(row.wallet_balance || 0),
			}))
		)
		setLoading(false)
	}

	useEffect(() => {
		void loadUsers()

		const channel = supabase.client
			.channel('admin-users-live')
			.on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => void loadUsers())
			.on('postgres_changes', { event: '*', schema: 'public', table: 'wallets' }, () => void loadUsers())
			.subscribe()

		const interval = window.setInterval(() => {
			void loadUsers()
		}, 30000)

		return () => {
			window.clearInterval(interval)
			void supabase.client.removeChannel(channel)
		}
	}, [])

	const filteredUsers = useMemo(() => {
		const query = search.trim().toLowerCase()

		return users.filter((user) => {
			const statusMatch = statusFilter === 'all' || user.status === statusFilter
			const roleMatch = roleFilter === 'all' || user.role === roleFilter

			if (!query) {
				return statusMatch && roleMatch
			}

			const text = [user.full_name || '', user.email || '', user.phone || ''].join(' ').toLowerCase()
			return statusMatch && roleMatch && text.includes(query)
		})
	}, [users, search, statusFilter, roleFilter])

	const totalUsers = users.length
	const activeUsers = users.filter((user) => user.status === 'active').length
	const suspendedUsers = users.filter((user) => user.status === 'suspended').length
	const adminUsers = users.filter((user) => user.role === 'super_admin').length

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Users</h1>
				<p className="text-sm text-muted-foreground">Realtime user list with profile and wallet balances.</p>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm text-muted-foreground">Total Users</CardTitle>
					</CardHeader>
					<CardContent className="text-2xl font-bold">{loading ? '...' : totalUsers.toLocaleString()}</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm text-muted-foreground">Active</CardTitle>
					</CardHeader>
					<CardContent className="text-2xl font-bold">{loading ? '...' : activeUsers.toLocaleString()}</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm text-muted-foreground">Suspended</CardTitle>
					</CardHeader>
					<CardContent className="text-2xl font-bold">{loading ? '...' : suspendedUsers.toLocaleString()}</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm text-muted-foreground">Super Admins</CardTitle>
					</CardHeader>
					<CardContent className="text-2xl font-bold">{loading ? '...' : adminUsers.toLocaleString()}</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Users className="h-4 w-4" />
						All Users ({filteredUsers.length})
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
						<div className="relative">
							<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								placeholder="Search name, email or phone"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="pl-9"
							/>
						</div>
						<Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
							<SelectTrigger>
								<SelectValue placeholder="Status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Statuses</SelectItem>
								<SelectItem value="active">Active</SelectItem>
								<SelectItem value="suspended">Suspended</SelectItem>
							</SelectContent>
						</Select>
						<Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as typeof roleFilter)}>
							<SelectTrigger>
								<SelectValue placeholder="Role" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Roles</SelectItem>
								<SelectItem value="user">User</SelectItem>
								<SelectItem value="super_admin">Super Admin</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="hidden overflow-x-auto lg:block">
						<table className="w-full min-w-[900px] text-sm">
							<thead className="bg-muted/60 text-left">
								<tr>
									<th className="px-3 py-3">User</th>
									<th className="px-3 py-3">Contact</th>
									<th className="px-3 py-3">Role</th>
									<th className="px-3 py-3">Status</th>
									<th className="px-3 py-3">Wallet</th>
									<th className="px-3 py-3">Joined</th>
								</tr>
							</thead>
							<tbody>
								{loading ? (
									<tr>
										<td className="px-3 py-8 text-muted-foreground" colSpan={6}>Loading users...</td>
									</tr>
								) : filteredUsers.length === 0 ? (
									<tr>
										<td className="px-3 py-8 text-muted-foreground" colSpan={6}>No users found.</td>
									</tr>
								) : (
									filteredUsers.map((user) => (
										<tr key={user.id} className="border-t border-border">
											<td className="px-3 py-3">
												<p className="font-medium">{user.full_name || 'Unnamed User'}</p>
												<p className="text-xs text-muted-foreground">{user.id}</p>
											</td>
											<td className="px-3 py-3">
												<p>{user.email || '-'}</p>
												<p className="text-xs text-muted-foreground">{user.phone || '-'}</p>
											</td>
											<td className="px-3 py-3">
												<Badge variant="outline">{user.role}</Badge>
											</td>
											<td className="px-3 py-3">
												<Badge variant={user.status === 'active' ? 'default' : 'destructive'}>{user.status}</Badge>
											</td>
											<td className="px-3 py-3 font-medium">{ghanaCurrency(user.wallet_balance)}</td>
											<td className="px-3 py-3 text-xs text-muted-foreground">{formatDateTime(user.created_at)}</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>

					<div className="space-y-3 lg:hidden">
						{loading ? (
							<p className="text-sm text-muted-foreground">Loading users...</p>
						) : filteredUsers.length === 0 ? (
							<p className="text-sm text-muted-foreground">No users found.</p>
						) : (
							filteredUsers.map((user) => (
								<div key={user.id} className="rounded-lg border border-border p-3">
									<div className="flex items-center justify-between gap-2">
										<p className="font-medium">{user.full_name || 'Unnamed User'}</p>
										<Badge variant={user.status === 'active' ? 'default' : 'destructive'}>{user.status}</Badge>
									</div>
									<p className="mt-1 text-xs text-muted-foreground">{user.email || 'No email'}</p>
									<p className="mt-1 text-xs text-muted-foreground">{user.phone || 'No phone'}</p>
									<div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
										<Badge variant="outline">{user.role}</Badge>
										<span>{ghanaCurrency(user.wallet_balance)}</span>
										<span>{formatDateTime(user.created_at)}</span>
									</div>
								</div>
							))
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
