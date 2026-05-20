'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminUsersPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Users</h1>
				<p className="text-sm text-muted-foreground">User management dashboard</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Users Module</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						This page has been restored to keep admin deployments healthy. Continue user management from the admin overview while detailed tools are finalized.
					</p>
				</CardContent>
			</Card>
		</div>
	)
}
