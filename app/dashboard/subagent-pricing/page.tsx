'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Save, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DashboardPageShell,
  DashboardPanel,
  DashboardStatGrid,
  DashboardStatCard,
} from '@/components/dashboard/page-shell'
import { FlashPageLoader } from '@/components/flash-loader'
import { SubAgentRecruitGate } from '@/components/dashboard/subagent-recruit-gate'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

type PackageRow = {
  id: string
  network: string
  name: string
  amount: string
  agent_price: number
  wholesale: string
}

type ServiceRow = {
  id: string
  name: string
  category: string
  agent_price: number
  wholesale: string
}

export default function SubAgentPricingPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [packages, setPackages] = useState<PackageRow[]>([])
  const [services, setServices] = useState<ServiceRow[]>([])
  const [afaFloor, setAfaFloor] = useState(0)
  const [afaWholesale, setAfaWholesale] = useState('')
  const [markupPercent, setMarkupPercent] = useState('10')

  const getAuthHeaders = async () => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) throw new Error('Please login again')
    return { Authorization: `Bearer ${token}` }
  }

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const uid = sessionData.session?.user?.id
      if (!uid) throw new Error('Please login again')

      const [{ data: pkgs }, { data: svcs }, { data: afa }, { data: pkgPrices }, { data: svcPrices }, { data: afaPrice }] =
        await Promise.all([
          supabase.client
            .from('data_packages')
            .select('id,network,name,amount,agent_price,selling_price')
            .eq('is_active', true)
            .order('network')
            .order('amount'),
          supabase.client
            .from('online_services')
            .select('id,name,category,agent_price,price')
            .eq('is_active', true)
            .order('name'),
          supabase.client.from('afa_settings').select('agent_price,base_price').eq('id', 1).maybeSingle(),
          supabase.client.from('sub_agent_package_prices').select('package_id,price').eq('parent_agent_id', uid),
          supabase.client.from('sub_agent_service_prices').select('service_id,price').eq('parent_agent_id', uid),
          supabase.client.from('sub_agent_afa_prices').select('price').eq('parent_agent_id', uid).maybeSingle(),
        ])

      const pkgMap = new Map((pkgPrices || []).map((r) => [r.package_id, Number(r.price)]))
      const svcMap = new Map((svcPrices || []).map((r) => [r.service_id, Number(r.price)]))

      setPackages(
        (pkgs || []).map((pkg) => {
          const floor = Number(pkg.agent_price || pkg.selling_price || 0)
          return {
            id: pkg.id,
            network: pkg.network,
            name: pkg.name,
            amount: String(pkg.amount),
            agent_price: floor,
            wholesale: String(pkgMap.get(pkg.id) ?? floor),
          }
        })
      )

      setServices(
        (svcs || []).map((svc) => {
          const floor = Number(svc.agent_price || svc.price || 0)
          return {
            id: svc.id,
            name: svc.name,
            category: svc.category || 'Service',
            agent_price: floor,
            wholesale: String(svcMap.get(svc.id) ?? floor),
          }
        })
      )

      const floor = Number(afa?.agent_price || afa?.base_price || 0)
      setAfaFloor(floor)
      setAfaWholesale(String(afaPrice?.price != null ? Number(afaPrice.price) : floor))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load pricing')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const applyMarkup = () => {
    const pct = Number(markupPercent)
    if (!Number.isFinite(pct) || pct < 0) {
      toast.error('Enter a valid markup percent')
      return
    }
    setPackages((rows) =>
      rows.map((row) => ({
        ...row,
        wholesale: (row.agent_price * (1 + pct / 100)).toFixed(2),
      }))
    )
    setServices((rows) =>
      rows.map((row) => ({
        ...row,
        wholesale: (row.agent_price * (1 + pct / 100)).toFixed(2),
      }))
    )
    setAfaWholesale((afaFloor * (1 + pct / 100)).toFixed(2))
    toast.success(`Applied ${pct}% markup to all rows`)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const headers = await getAuthHeaders()
      const response = await fetch('/api/dashboard/subagent-pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          packages: packages.map((row) => ({ packageId: row.id, price: Number(row.wholesale) })),
          services: services.map((row) => ({ serviceId: row.id, price: Number(row.wholesale) })),
          afaPrice: Number(afaWholesale),
        }),
      })
      const result = (await response.json().catch(() => null)) as { success?: boolean; error?: string }
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Unable to save prices')
      }
      toast.success('Subagent wholesale prices saved')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const pricedCount = useMemo(
    () => packages.filter((row) => Number(row.wholesale) > row.agent_price).length,
    [packages]
  )

  if (loading) return <FlashPageLoader />

  if (error) {
    return (
      <DashboardPageShell title="Subagent Pricing" description="Set wholesale prices your subagents pay.">
        <DashboardPanel>
          <p className="text-sm text-red-500">{error}</p>
        </DashboardPanel>
      </DashboardPageShell>
    )
  }

  return (
    <SubAgentRecruitGate>
    <DashboardPageShell
      title="Subagent Pricing"
      description="Your agent price is the floor. Set higher wholesale prices for all your subagents."
      stats={
        <DashboardStatGrid>
          <DashboardStatCard label="Packages" value={String(packages.length)} icon={Tag} />
          <DashboardStatCard label="Marked up" value={String(pricedCount)} />
          <DashboardStatCard label="Services" value={String(services.length)} />
        </DashboardStatGrid>
      }
    >
      <DashboardPanel title="Bulk markup">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500">Markup %</label>
            <Input
              type="number"
              min={0}
              step={0.5}
              value={markupPercent}
              onChange={(e) => setMarkupPercent(e.target.value)}
              className="mt-1 w-28"
            />
          </div>
          <Button type="button" variant="outline" onClick={applyMarkup}>
            Apply to all
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="bg-amber-400 text-black hover:bg-amber-300"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save prices
          </Button>
        </div>
      </DashboardPanel>

      <DashboardPanel title="Data packages">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-gray-500">
                <th className="px-2 py-2">Package</th>
                <th className="px-2 py-2">Your cost</th>
                <th className="px-2 py-2">Subagent pays</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((row) => (
                <tr key={row.id} className="border-b border-gray-100 dark:border-white/5">
                  <td className="px-2 py-2 font-medium">
                    {row.network} · {row.amount} · {row.name}
                  </td>
                  <td className="px-2 py-2">GHc {row.agent_price.toFixed(2)}</td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      min={row.agent_price}
                      step={0.1}
                      value={row.wholesale}
                      onChange={(e) =>
                        setPackages((list) =>
                          list.map((item) => (item.id === row.id ? { ...item, wholesale: e.target.value } : item))
                        )
                      }
                      className="w-28"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardPanel>

      <DashboardPanel title="Services">
        <div className="space-y-3">
          {services.map((row) => (
            <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
              <div>
                <p className="font-semibold">{row.name}</p>
                <p className="text-xs text-gray-500">
                  {row.category} · Your cost GHc {row.agent_price.toFixed(2)}
                </p>
              </div>
              <Input
                type="number"
                min={row.agent_price}
                step={0.1}
                value={row.wholesale}
                onChange={(e) =>
                  setServices((list) =>
                    list.map((item) => (item.id === row.id ? { ...item, wholesale: e.target.value } : item))
                  )
                }
                className="w-28"
              />
            </div>
          ))}
          {services.length === 0 ? <p className="text-sm text-gray-500">No active services.</p> : null}
        </div>
      </DashboardPanel>

      <DashboardPanel title="AFA">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-500">Your cost GHc {afaFloor.toFixed(2)}</p>
          <Input
            type="number"
            min={afaFloor}
            step={0.1}
            value={afaWholesale}
            onChange={(e) => setAfaWholesale(e.target.value)}
            className="w-28"
          />
        </div>
      </DashboardPanel>
    </DashboardPageShell>
    </SubAgentRecruitGate>
  )
}
