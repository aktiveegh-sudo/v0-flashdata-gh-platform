import { NextRequest } from 'next/server'
import { assertAdminRequest } from '@/lib/admin/auth'
import { jsonError, jsonOk, supabaseAdmin } from '@/lib/api/rest'
import { sendAdminBroadcastSms } from '@/lib/sms/usmsgh'

type BroadcastBody = {
  mode?: 'all' | 'selected'
  userIds?: string[]
  title?: string
  message?: string
  type?: 'info' | 'success' | 'warning' | 'error'
  sendInApp?: boolean
  sendSms?: boolean
}

export async function POST(request: NextRequest) {
  const { response } = await assertAdminRequest(request)
  if (response) {
    return response
  }

  try {
    const body = (await request.json().catch(() => ({}))) as BroadcastBody
    const message = String(body.message || '').trim()
    const title = String(body.title || '').trim()
    const mode = body.mode === 'selected' ? 'selected' : 'all'
    const sendInApp = body.sendInApp !== false
    const sendSms = body.sendSms === true

    if (!message) {
      return jsonError('message is required', 400)
    }

    if (!sendInApp && !sendSms) {
      return jsonError('Choose at least one delivery channel', 400)
    }

    let targetIds: string[] = []

    if (mode === 'all') {
      const { data, error } = await supabaseAdmin.from('profiles').select('id')
      if (error) {
        return jsonError(error.message, 500)
      }
      targetIds = ((data || []) as Array<{ id: string }>).map((row) => row.id).filter(Boolean)
    } else {
      targetIds = (body.userIds || []).map((id) => String(id).trim()).filter(Boolean)
    }

    if (targetIds.length === 0) {
      return jsonError('No target users found', 400)
    }

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id,full_name,phone')
      .in('id', targetIds)

    if (profilesError) {
      return jsonError(profilesError.message, 500)
    }

    const recipients = (profiles || []) as Array<{ id: string; full_name: string | null; phone: string | null }>

    if (sendInApp) {
      const notificationType = body.type || 'info'
      const { error } = await supabaseAdmin.from('notifications').insert(
        recipients.map((profile) => ({
          user_id: profile.id,
          title: title || 'FlashData GH',
          message,
          type: notificationType,
          is_read: false,
        }))
      )

      if (error) {
        return jsonError(error.message, 500)
      }
    }

    let smsSent = 0
    let smsFailed = 0
    let smsSkipped = 0

    if (sendSms) {
      const smsBody = title ? `${title}\n\n${message}` : message

      for (const profile of recipients) {
        const phone = (profile.phone || '').trim()
        if (!phone) {
          smsSkipped += 1
          continue
        }

        const result = await sendAdminBroadcastSms({ phone, message: smsBody })
        if (result.ok) {
          smsSent += 1
        } else if (result.skipped) {
          smsSkipped += 1
        } else {
          smsFailed += 1
        }
      }
    }

    return jsonOk({
      targetedUsers: recipients.length,
      inAppSent: sendInApp ? recipients.length : 0,
      smsSent,
      smsFailed,
      smsSkipped,
    })
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Unable to broadcast notification', 500)
  }
}
