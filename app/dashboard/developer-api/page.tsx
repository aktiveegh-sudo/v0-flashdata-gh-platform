'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  Key,
  RefreshCw,
  Shield,
  Terminal,
  Zap,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

/* ───────────────────────────── types ───────────────────────────── */

type ApiUser = {
  id: string
  api_key: string
  usage_limit: number
  usage_count: number
  is_active: boolean
}

type EndpointDoc = {
  method: 'GET' | 'POST'
  path: string
  summary: string
  description: string
  auth: boolean
  queryParams?: { name: string; type: string; required: boolean; description: string }[]
  requestBody?: { name: string; type: string; required: boolean; description: string }[]
  responseExample: string
  requestExample?: string
}

/* ───────────────────────────── endpoint docs ───────────────────── */

const buildDocs = (baseUrl: string, apiKey: string): EndpointDoc[] => [
  {
    method: 'GET',
    path: '/api/v1/balance',
    summary: 'Get wallet balance',
    description:
      'Returns the current wallet balance and last updated timestamp for the account that owns the API key.',
    auth: true,
    responseExample: JSON.stringify(
      { success: true, data: { balance: 45.5, last_updated: '2026-05-19T10:00:00Z' } },
      null,
      2
    ),
  },
  {
    method: 'GET',
    path: '/api/v1/packages',
    summary: 'List data packages',
    description: 'Returns all active data packages including network, name, amount, and price fields.',
    auth: true,
    responseExample: JSON.stringify(
      {
        success: true,
        data: {
          packages: [
            {
              id: 'uuid-here',
              network: 'MTN',
              name: '1GB Daily',
              amount: '1GB',
              cost_price: 4.5,
              selling_price: 5,
              validity: '1 Day',
              is_active: true,
            },
          ],
        },
      },
      null,
      2
    ),
  },
  {
    method: 'GET',
    path: '/api/v1/services',
    summary: 'List online services',
    description: 'Returns all active online services (non-data: cable TV, electricity, etc.).',
    auth: true,
    responseExample: JSON.stringify(
      {
        success: true,
        data: {
          services: [{ id: 'uuid-here', name: 'DStv Subscription', category: 'TV', price: 35, is_active: true }],
        },
      },
      null,
      2
    ),
  },
  {
    method: 'POST',
    path: '/api/v1/data/purchase',
    summary: 'Purchase data bundle',
    description:
      'Creates a pending data order. The order is queued for processing. Returns the order object with a reference you can use to track status.',
    auth: true,
    requestBody: [
      { name: 'package_id', type: 'string (UUID)', required: true, description: 'ID of the data package to buy' },
      {
        name: 'phone',
        type: 'string',
        required: true,
        description: 'Recipient phone number — Ghana format: 0241234567 or +233241234567',
      },
    ],
    requestExample: JSON.stringify({ package_id: 'PACKAGE_UUID', phone: '0241234567' }, null, 2),
    responseExample: JSON.stringify(
      {
        success: true,
        data: {
          order: { id: 'uuid', status: 'pending', amount: 5, reference: 'API-MTN-ABC123', created_at: '...' },
          package: { id: 'uuid', network: 'MTN', name: '1GB Daily', amount: '1GB' },
        },
      },
      null,
      2
    ),
  },
  {
    method: 'POST',
    path: '/api/v1/afa/register',
    summary: 'Submit AFA registration',
    description:
      'Submits an AFA (Ghana Registration) request. Creates a pending registration at the current AFA base price.',
    auth: true,
    requestBody: [
      { name: 'full_name', type: 'string', required: true, description: 'Full legal name of the applicant' },
      { name: 'phone', type: 'string', required: true, description: "Applicant's Ghana phone number" },
      {
        name: 'ghana_card_number',
        type: 'string',
        required: true,
        description: 'Format: GHA-123456789-1',
      },
      { name: 'location', type: 'string', required: true, description: 'Town or district of applicant' },
    ],
    requestExample: JSON.stringify(
      { full_name: 'Kofi Mensah', phone: '0241234567', ghana_card_number: 'GHA-123456789-1', location: 'Accra' },
      null,
      2
    ),
    responseExample: JSON.stringify(
      {
        success: true,
        data: {
          registration: { id: 'uuid', status: 'pending', amount: 12, reference: 'AFA-API-XY123', created_at: '...' },
        },
      },
      null,
      2
    ),
  },
  {
    method: 'GET',
    path: '/api/v1/orders',
    summary: 'List all orders',
    description:
      'Returns a merged list of data orders and AFA registrations, newest first. Use query params to filter.',
    auth: true,
    queryParams: [
      { name: 'limit', type: 'number', required: false, description: 'Max results (1-100, default 20)' },
      {
        name: 'status',
        type: 'string',
        required: false,
        description: 'Filter by status: pending | processing | completed | failed',
      },
      { name: 'type', type: 'string', required: false, description: 'Filter by type: data | afa (omit for both)' },
    ],
    responseExample: JSON.stringify(
      {
        success: true,
        data: {
          orders: [
            {
              id: 'uuid',
              type: 'data',
              reference: 'API-MTN-ABC123',
              phone: '+233241234567',
              amount: 5,
              status: 'completed',
              created_at: '2026-05-19T10:00:00Z',
              package: { network: 'MTN', name: '1GB Daily', amount: '1GB' },
            },
          ],
          count: 1,
        },
      },
      null,
      2
    ),
  },
  {
    method: 'GET',
    path: '/api/v1/orders/:id',
    summary: 'Get order status',
    description: 'Looks up a single order by its ID (works for both data orders and AFA registrations).',
    auth: true,
    responseExample: JSON.stringify(
      {
        success: true,
        data: {
          order: {
            id: 'uuid',
            type: 'afa',
            reference: 'AFA-API-XY123',
            full_name: 'Kofi Mensah',
            phone: '+233241234567',
            amount: 12,
            status: 'pending',
            created_at: '2026-05-19T10:00:00Z',
          },
        },
      },
      null,
      2
    ),
  },
  {
    method: 'GET',
    path: '/api/v1/transactions',
    summary: 'List transactions',
    description: "Returns the account's wallet transaction history, newest first.",
    auth: true,
    queryParams: [
      { name: 'limit', type: 'number', required: false, description: 'Max results (1-100, default 50)' },
    ],
    responseExample: JSON.stringify(
      {
        success: true,
        data: {
          transactions: [
            {
              id: 'uuid',
              type: 'debit',
              amount: 5,
              description: 'Data purchase - MTN 1GB Daily',
              status: 'success',
              reference: 'REF-123',
              created_at: '...',
            },
          ],
        },
      },
      null,
      2
    ),
  },
]

/* ───────────────────────────── helpers ─────────────────────────── */

const generateApiKey = () => {
  const random = crypto.getRandomValues(new Uint8Array(24))
  return `fd_live_${Array.from(random)
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`
}

const buildCurl = (baseUrl: string, doc: EndpointDoc, apiKey: string) => {
  const flag = doc.method === 'POST' ? '-X POST' : ''
  const bodyFlag = doc.requestExample ? `\\\n  -d '${doc.requestExample.replace(/\n/g, '\n  ')}'` : ''
  const pathWithId = doc.path.replace(':id', 'ORDER_UUID_HERE')
  return `curl ${flag} ${baseUrl}${pathWithId} \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json"${bodyFlag ? ' \\' : ''}
${bodyFlag}`.trim()
}

const buildJs = (baseUrl: string, doc: EndpointDoc, apiKey: string) => {
  const pathWithId = doc.path.replace(':id', 'ORDER_UUID_HERE')
  const bodyPart = doc.requestExample
    ? `,\n  body: JSON.stringify(${doc.requestExample})`
    : ''
  return `const response = await fetch('${baseUrl}${pathWithId}', {
  method: '${doc.method}',
  headers: {
    'Authorization': 'Bearer ${apiKey}',
    'Content-Type': 'application/json'
  }${bodyPart}
})

const result = await response.json()
console.log(result)`
}

const buildPython = (baseUrl: string, doc: EndpointDoc, apiKey: string) => {
  const pathWithId = doc.path.replace(':id', 'ORDER_UUID_HERE')
  const bodyPart = doc.requestExample ? `,\n    json=${doc.requestExample}` : ''
  const method = doc.method === 'POST' ? 'post' : 'get'
  return `import requests

response = requests.${method}(
    '${baseUrl}${pathWithId}',
    headers={
        'Authorization': 'Bearer ${apiKey}',
        'Content-Type': 'application/json'
    }${bodyPart}
)

print(response.json())`
}

/* ───────────────────────────── sub-components ──────────────────── */

function CopyButton({ text, size = 'icon' }: { text: string; size?: 'icon' | 'sm' }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <Button variant="outline" size={size} onClick={() => void copy()}>
      {copied ? (
        <>
          <Check className="h-4 w-4 text-green-500" />
          {size === 'sm' && <span className="ml-1">Copied</span>}
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          {size === 'sm' && <span className="ml-1">Copy</span>}
        </>
      )}
    </Button>
  )
}

function EndpointCard({
  doc,
  baseUrl,
  apiKey,
}: {
  doc: EndpointDoc
  baseUrl: string
  apiKey: string
}) {
  const [open, setOpen] = useState(false)
  const [codeTab, setCodeTab] = useState('curl')

  const methodColor =
    doc.method === 'POST'
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
      : 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400'

  const codeMap = useMemo(
    () => ({
      curl: buildCurl(baseUrl, doc, apiKey),
      javascript: buildJs(baseUrl, doc, apiKey),
      python: buildPython(baseUrl, doc, apiKey),
    }),
    [baseUrl, doc, apiKey]
  )

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Badge className={`shrink-0 font-mono text-xs px-2 py-0.5 ${methodColor}`}>{doc.method}</Badge>
          <code className="text-sm font-mono truncate">{doc.path}</code>
          <span className="hidden sm:inline text-sm text-muted-foreground">— {doc.summary}</span>
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border p-4 space-y-5">
              <p className="text-sm text-muted-foreground">{doc.description}</p>

              {doc.queryParams && doc.queryParams.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Query Parameters
                  </p>
                  <div className="rounded-md border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-xs">Name</th>
                          <th className="px-3 py-2 text-left font-medium text-xs">Type</th>
                          <th className="px-3 py-2 text-left font-medium text-xs">Required</th>
                          <th className="px-3 py-2 text-left font-medium text-xs">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {doc.queryParams.map((p) => (
                          <tr key={p.name} className="border-t border-border">
                            <td className="px-3 py-2 font-mono text-xs">{p.name}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">{p.type}</td>
                            <td className="px-3 py-2 text-xs">
                              {p.required ? (
                                <Badge variant="destructive" className="text-xs px-1">required</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs px-1">optional</Badge>
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">{p.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {doc.requestBody && doc.requestBody.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Request Body (JSON)
                  </p>
                  <div className="rounded-md border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-xs">Field</th>
                          <th className="px-3 py-2 text-left font-medium text-xs">Type</th>
                          <th className="px-3 py-2 text-left font-medium text-xs">Required</th>
                          <th className="px-3 py-2 text-left font-medium text-xs">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {doc.requestBody.map((f) => (
                          <tr key={f.name} className="border-t border-border">
                            <td className="px-3 py-2 font-mono text-xs">{f.name}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">{f.type}</td>
                            <td className="px-3 py-2 text-xs">
                              {f.required ? (
                                <Badge variant="destructive" className="text-xs px-1">required</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs px-1">optional</Badge>
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">{f.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Code Example
                  </p>
                  <CopyButton text={codeMap[codeTab as keyof typeof codeMap]} size="sm" />
                </div>
                <Tabs value={codeTab} onValueChange={setCodeTab}>
                  <TabsList className="h-8">
                    <TabsTrigger value="curl" className="text-xs">cURL</TabsTrigger>
                    <TabsTrigger value="javascript" className="text-xs">JavaScript</TabsTrigger>
                    <TabsTrigger value="python" className="text-xs">Python</TabsTrigger>
                  </TabsList>
                  {Object.entries(codeMap).map(([lang, code]) => (
                    <TabsContent key={lang} value={lang}>
                      <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-3 text-xs leading-relaxed">
                        <code>{code}</code>
                      </pre>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Response Example
                  </p>
                  <CopyButton text={doc.responseExample} size="sm" />
                </div>
                <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs leading-relaxed">
                  <code>{doc.responseExample}</code>
                </pre>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ───────────────────────────── main page ───────────────────────── */

export default function DeveloperApiPage() {
  const [loading, setLoading] = useState(true)
  const [apiUser, setApiUser] = useState<ApiUser | null>(null)
  const [creating, setCreating] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [showKey, setShowKey] = useState(false)

  const baseUrl = useMemo(
    () => (typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'),
    []
  )

  const maskedKey = useMemo(() => {
    if (!apiUser?.api_key) return ''
    const k = apiUser.api_key
    return `${k.slice(0, 10)}${'\u2022'.repeat(Math.max(0, k.length - 14))}${k.slice(-4)}`
  }, [apiUser])

  const docs = useMemo(
    () => buildDocs(baseUrl, apiUser?.api_key || 'fd_live_xxxxxxxxxxxxx'),
    [baseUrl, apiUser]
  )

  const loadApiUser = async () => {
    setLoading(true)
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData.user) {
      toast.error('Please login again')
      setLoading(false)
      return
    }

    const { data, error } = await supabase.client
      .from('api_users')
      .select('id,api_key,usage_limit,usage_count,is_active')
      .eq('user_id', authData.user.id)
      .maybeSingle()

    if (error) toast.error(error.message)
    setApiUser((data as ApiUser | null) ?? null)
    setLoading(false)
  }

  useEffect(() => {
    void loadApiUser()
  }, [])

  const createApiKey = async () => {
    setCreating(true)
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData.user) {
      toast.error('Please login again')
      setCreating(false)
      return
    }

    const { error } = await supabase.client.from('api_users').insert({
      user_id: authData.user.id,
      api_key: generateApiKey(),
      usage_limit: 1000,
      usage_count: 0,
      is_active: true,
    })

    setCreating(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('API key created!')
    await loadApiUser()
  }

  const regenerateApiKey = async () => {
    if (!apiUser) return
    setRegenerating(true)

    const { error } = await supabase.client
      .from('api_users')
      .update({ api_key: generateApiKey(), usage_count: 0, is_active: true })
      .eq('id', apiUser.id)

    setRegenerating(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('API key regenerated — update all your integrations!')
    await loadApiUser()
  }

  if (loading) {
    return <div className="py-10 text-sm text-muted-foreground">Loading API configuration...</div>
  }

  const usagePct = apiUser ? Math.round((apiUser.usage_count / apiUser.usage_limit) * 100) : 0

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground lg:text-3xl">Developer API</h1>
        <p className="text-muted-foreground mt-1">
          Integrate Flashdata GH into your app — check balance, buy data, register AFA, and more.
        </p>
      </div>

      {/* Base URL banner */}
      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
        <span className="font-medium shrink-0">Base URL</span>
        <Separator orientation="vertical" className="h-4" />
        <code className="font-mono text-primary break-all">{baseUrl}</code>
        <CopyButton text={baseUrl} />
      </div>

      {/* API Key management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" /> Your API Key
          </CardTitle>
          <CardDescription>
            Pass this in the{' '}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">Authorization: Bearer YOUR_KEY</code>{' '}
            header on every request.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!apiUser ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">No API key yet. Generate one to start using the API.</p>
              <Button onClick={() => void createApiKey()} disabled={creating}>
                {creating ? 'Generating...' : 'Generate API Key'}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Input
                  value={showKey ? apiUser.api_key : maskedKey}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowKey((p) => !p)}
                  title={showKey ? 'Hide' : 'Reveal'}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <CopyButton text={apiUser.api_key} />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => void regenerateApiKey()}
                  disabled={regenerating}
                  title="Regenerate key"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 items-center text-xs">
                <Badge variant={apiUser.is_active ? 'default' : 'destructive'}>
                  {apiUser.is_active ? 'Active' : 'Revoked'}
                </Badge>
                <Badge variant="secondary">
                  {apiUser.usage_count}/{apiUser.usage_limit} requests used ({usagePct}%)
                </Badge>
              </div>

              {/* usage bar */}
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    usagePct > 80 ? 'bg-destructive' : usagePct > 50 ? 'bg-amber-500' : 'bg-primary'
                  }`}
                  style={{ width: `${usagePct}%` }}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" /> Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Every request must include your API key in the{' '}
            <code className="bg-muted px-1 py-0.5 rounded text-foreground">Authorization</code> header:
          </p>
          <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">
            <code>Authorization: Bearer fd_live_xxxxxxxxxxxxxxxxxxxxxxxx</code>
          </pre>
          <ul className="list-disc pl-5 space-y-1">
            <li>Keep your API key on your backend server — never expose it in frontend/mobile code.</li>
            <li>Rotate the key immediately if it is ever leaked.</li>
            <li>All requests must be made over HTTPS.</li>
            <li>
              A <code className="bg-muted px-1 py-0.5 rounded text-foreground">429</code> response means you
              have hit your usage limit — contact support to increase it.
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Response format */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-primary" /> Response Format
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>All responses are JSON with a consistent envelope:</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2 text-foreground">Success</p>
              <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">
                <code>{'{\n  "success": true,\n  "data": { ... }\n}'}</code>
              </pre>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2 text-foreground">Error</p>
              <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">
                <code>{'{\n  "success": false,\n  "error": "message here"\n}'}</code>
              </pre>
            </div>
          </div>
          <div className="rounded-md border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium">HTTP Status</th>
                  <th className="px-3 py-2 text-left text-xs font-medium">Meaning</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {[
                  ['200', 'Success'],
                  ['201', 'Created (new order/registration)'],
                  ['400', 'Bad request — check your request body'],
                  ['401', 'Missing or invalid API key'],
                  ['403', 'Key revoked or service disabled'],
                  ['404', 'Resource not found'],
                  ['429', 'Usage limit exceeded'],
                  ['500', 'Server error — try again or contact support'],
                ].map(([code, msg]) => (
                  <tr key={code} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-muted-foreground">{code}</td>
                    <td className="px-3 py-2">{msg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Endpoint reference */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Endpoint Reference</h2>
          <Badge variant="secondary">{docs.length} endpoints</Badge>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Click any endpoint to expand its documentation, request schema, and copy-ready code examples.
        </p>
        <div className="space-y-2">
          {docs.map((doc) => (
            <EndpointCard
              key={doc.path}
              doc={doc}
              baseUrl={baseUrl}
              apiKey={apiUser?.api_key || 'fd_live_xxxxxxxxxxxxx'}
            />
          ))}
        </div>
      </div>

      {/* Quick tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" /> Quick Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            1. Use{' '}
            <code className="bg-muted px-1 rounded text-foreground">GET /api/v1/packages</code> first to get
            valid <code className="bg-muted px-1 rounded text-foreground">package_id</code> values before
            placing data orders.
          </p>
          <p>
            2. Orders are created with status{' '}
            <code className="bg-muted px-1 rounded text-foreground">pending</code> and processed by our system
            — poll{' '}
            <code className="bg-muted px-1 rounded text-foreground">GET /api/v1/orders/:id</code> to check
            completion.
          </p>
          <p>
            3. Phone numbers are accepted as{' '}
            <code className="bg-muted px-1 rounded text-foreground">0241234567</code>,{' '}
            <code className="bg-muted px-1 rounded text-foreground">+233241234567</code>, or{' '}
            <code className="bg-muted px-1 rounded text-foreground">233241234567</code>.
          </p>
          <p>
            4. Ghana Card numbers must match the pattern{' '}
            <code className="bg-muted px-1 rounded text-foreground">GHA-123456789-1</code> (exactly).
          </p>
          <p>5. Your usage counter resets to 0 when you regenerate your API key.</p>
        </CardContent>
      </Card>
    </motion.div>
  )
}
