'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Code2, Copy, Check, Key, BookOpen, Zap, Shield, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import toast from 'react-hot-toast'

const apiKey = 'fd_live_sk_1234567890abcdefghijklmnop'
const testApiKey = 'fd_test_sk_0987654321zyxwvutsrqponml'

const endpoints = [
  {
    method: 'POST',
    path: '/api/v1/data/purchase',
    description: 'Purchase data bundle for a phone number',
  },
  {
    method: 'POST',
    path: '/api/v1/airtime/purchase',
    description: 'Purchase airtime for a phone number',
  },
  {
    method: 'GET',
    path: '/api/v1/balance',
    description: 'Get your current wallet balance',
  },
  {
    method: 'GET',
    path: '/api/v1/transactions',
    description: 'List all transactions',
  },
  {
    method: 'GET',
    path: '/api/v1/transactions/:id',
    description: 'Get a specific transaction',
  },
  {
    method: 'GET',
    path: '/api/v1/packages',
    description: 'List all available data packages',
  },
]

const codeExamples = {
  curl: `curl -X POST https://api.flashdata.gh/v1/data/purchase \\
  -H "Authorization: Bearer fd_live_sk_xxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "network": "mtn",
    "phone": "0241234567",
    "package": "2GB",
    "amount": 10.00
  }'`,
  javascript: `const response = await fetch('https://api.flashdata.gh/v1/data/purchase', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer fd_live_sk_xxxxx',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    network: 'mtn',
    phone: '0241234567',
    package: '2GB',
    amount: 10.00
  })
});

const data = await response.json();
console.log(data);`,
  python: `import requests

response = requests.post(
    'https://api.flashdata.gh/v1/data/purchase',
    headers={
        'Authorization': 'Bearer fd_live_sk_xxxxx',
        'Content-Type': 'application/json',
    },
    json={
        'network': 'mtn',
        'phone': '0241234567',
        'package': '2GB',
        'amount': 10.00
    }
)

data = response.json()
print(data)`,
  php: `<?php
$ch = curl_init();

curl_setopt_array($ch, [
    CURLOPT_URL => 'https://api.flashdata.gh/v1/data/purchase',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer fd_live_sk_xxxxx',
        'Content-Type: application/json',
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'network' => 'mtn',
        'phone' => '0241234567',
        'package' => '2GB',
        'amount' => 10.00
    ])
]);

$response = curl_exec($ch);
$data = json_decode($response, true);
print_r($data);`,
}

export default function DeveloperApiPage() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState(false)
  const [activeTab, setActiveTab] = useState('curl')

  const copyToClipboard = (text: string, keyType?: string) => {
    navigator.clipboard.writeText(text)
    if (keyType) {
      setCopiedKey(keyType)
      setTimeout(() => setCopiedKey(null), 2000)
      toast.success('API key copied to clipboard')
    } else {
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
      toast.success('Code copied to clipboard')
    }
  }

  const regenerateKey = (keyType: string) => {
    toast.success(`${keyType} API key regenerated!`)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground lg:text-3xl">Developer API</h1>
        <p className="text-muted-foreground">
          Integrate FlashData GH into your applications
        </p>
      </div>

      {/* API Keys */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-green-500" />
              Live API Key
            </CardTitle>
            <CardDescription>Use this key for production transactions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                value={apiKey}
                readOnly
                className="font-mono text-sm"
                type="password"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(apiKey, 'live')}
              >
                {copiedKey === 'live' ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => regenerateKey('Live')}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              Active
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-orange-500" />
              Test API Key
            </CardTitle>
            <CardDescription>Use this key for testing (no real charges)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                value={testApiKey}
                readOnly
                className="font-mono text-sm"
                type="password"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(testApiKey, 'test')}
              >
                {copiedKey === 'test' ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => regenerateKey('Test')}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
              Test Mode
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Quick Start */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Quick Start
          </CardTitle>
          <CardDescription>Get started with the FlashData API in minutes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-border p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
                1
              </div>
              <h3 className="mt-3 font-semibold text-foreground">Get API Key</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Copy your API key from above to authenticate requests
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
                2
              </div>
              <h3 className="mt-3 font-semibold text-foreground">Fund Wallet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Add funds to your wallet for API transactions
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
                3
              </div>
              <h3 className="mt-3 font-semibold text-foreground">Make Requests</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Start making API calls to purchase data and airtime
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Code Examples */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-primary" />
            Code Examples
          </CardTitle>
          <CardDescription>Purchase data bundle example</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="curl">cURL</TabsTrigger>
                <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                <TabsTrigger value="python">Python</TabsTrigger>
                <TabsTrigger value="php">PHP</TabsTrigger>
              </TabsList>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => copyToClipboard(codeExamples[activeTab as keyof typeof codeExamples])}
              >
                {copiedCode ? (
                  <>
                    <Check className="h-4 w-4 text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            {Object.entries(codeExamples).map(([lang, code]) => (
              <TabsContent key={lang} value={lang}>
                <pre className="mt-4 overflow-x-auto rounded-lg bg-muted p-4">
                  <code className="text-sm">{code}</code>
                </pre>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            API Endpoints
          </CardTitle>
          <CardDescription>Base URL: https://api.flashdata.gh</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {endpoints.map((endpoint) => (
              <div
                key={endpoint.path}
                className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-4">
                  <Badge
                    variant="secondary"
                    className={
                      endpoint.method === 'POST'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    }
                  >
                    {endpoint.method}
                  </Badge>
                  <code className="text-sm font-medium">{endpoint.path}</code>
                </div>
                <span className="text-sm text-muted-foreground">{endpoint.description}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Security Best Practices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 text-green-500" />
              Never expose your API keys in client-side code
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 text-green-500" />
              Use environment variables to store your API keys
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 text-green-500" />
              Regenerate your API key if you suspect it has been compromised
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 text-green-500" />
              Use HTTPS for all API requests
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 text-green-500" />
              Implement webhook verification for transaction callbacks
            </li>
          </ul>
        </CardContent>
      </Card>
    </motion.div>
  )
}
