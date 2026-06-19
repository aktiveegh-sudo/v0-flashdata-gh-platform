'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HeadphonesIcon,
  Mail,
  Phone,
  MessageCircle,
  Send,
  X,
  CheckCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { DashboardPageShell, DashboardPanel } from '@/components/dashboard/page-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useLoadingStore } from '@/lib/store'
import toast from 'react-hot-toast'

const faqs = [
  {
    question: 'How long does data delivery take?',
    answer: 'Data is delivered instantly once payment is confirmed. In rare cases, it may take up to 5 minutes.',
  },
  {
    question: 'What happens if my transaction fails?',
    answer: 'Failed transactions are automatically refunded to your wallet within 24 hours.',
  },
  {
    question: 'How do I become a reseller?',
    answer: 'Simply sign up, fund your wallet, and start using the My Store section to manage your packages.',
  },
  {
    question: 'What are the withdrawal fees?',
    answer: 'We charge zero withdrawal fees! Withdrawals are processed within 24 hours.',
  },
]

const chatMessages = [
  { id: 1, type: 'bot', message: 'Hello! Welcome to FlashData GH support. How can I help you today?' },
  { id: 2, type: 'user', message: 'I need help with my recent transaction' },
  { id: 3, type: 'bot', message: 'I\'d be happy to help! Could you please provide your transaction reference number?' },
]

export default function ContactSupportPage() {
  const { setLoading } = useLoadingStore()
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [messages, setMessages] = useState(chatMessages)
  const [showSuccess, setShowSuccess] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      toast.error('Please fill in all fields')
      return
    }

    setLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setLoading(false)
    setShowSuccess(true)
  }

  const handleSendMessage = () => {
    if (!chatInput.trim()) return

    const newMessages = [
      ...messages,
      { id: messages.length + 1, type: 'user', message: chatInput },
    ]
    setMessages(newMessages)
    setChatInput('')

    // Simulate bot response
    setTimeout(() => {
      setMessages([
        ...newMessages,
        {
          id: newMessages.length + 1,
          type: 'bot',
          message: 'Thank you for your message. A support agent will review this shortly. Is there anything else I can help you with?',
        },
      ])
    }, 1000)
  }

  if (showSuccess) {
    return (
      <DashboardPageShell title="Help Center" description="Your message was sent successfully.">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex min-h-[40vh] items-center justify-center"
        >
          <DashboardPanel className="w-full max-w-md text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30"
            >
              <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
            </motion.div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Message Sent!</h2>
            <p className="mt-2 text-gray-500 dark:text-white/55">
              Thank you for contacting us. Our support team will get back to you within 24 hours.
            </p>
            <Button
              className="mt-6 w-full"
              onClick={() => {
                setShowSuccess(false)
                setFormData({ name: '', email: '', subject: '', message: '' })
              }}
            >
              Send Another Message
            </Button>
          </DashboardPanel>
        </motion.div>
      </DashboardPageShell>
    )
  }

  return (
    <DashboardPageShell title="Help Center" description="Get quick help from our team.">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <DashboardPanel
          title="Send us a Message"
          description="Fill out the form below and we'll get back to you within 24 hours"
          className="lg:col-span-2"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Kwame Asante"
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="kwame@example.com"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select
                  value={formData.subject}
                  onValueChange={(value) => setFormData({ ...formData, subject: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transaction">Transaction Issue</SelectItem>
                    <SelectItem value="account">Account Problem</SelectItem>
                    <SelectItem value="api">API Support</SelectItem>
                    <SelectItem value="billing">Billing Inquiry</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  name="message"
                  rows={5}
                  placeholder="Describe your issue or question..."
                  value={formData.message}
                  onChange={handleChange}
                />
              </div>
              <Button type="submit" className="w-full gap-2">
                <Send className="h-4 w-4" />
                Send Message
              </Button>
            </form>
        </DashboardPanel>

        <div className="space-y-6">
          <DashboardPanel title="Contact Info">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">+233 24 123 4567</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">support@flashdata.gh</p>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => setIsChatOpen(true)}
              >
                <MessageCircle className="h-4 w-4" />
                Live Chat
              </Button>
            </div>
          </DashboardPanel>

          <DashboardPanel title="FAQs">
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div key={index} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0 dark:border-white/5">
                  <p className="font-medium text-gray-900 dark:text-white">{faq.question}</p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-white/55">{faq.answer}</p>
                </div>
              ))}
            </div>
          </DashboardPanel>
        </div>
      </div>

      {/* Live Chat Widget */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-4 right-4 z-50 w-80 sm:w-96"
          >
            <Card className="shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between bg-primary p-4 text-primary-foreground">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  <span className="font-semibold">Live Chat</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                  onClick={() => setIsChatOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-64 overflow-y-auto p-4">
                  <div className="space-y-3">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                            msg.type === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-foreground'
                          }`}
                        >
                          {msg.message}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-t border-border p-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <Button size="icon" onClick={handleSendMessage}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
    </DashboardPageShell>
  )
}
