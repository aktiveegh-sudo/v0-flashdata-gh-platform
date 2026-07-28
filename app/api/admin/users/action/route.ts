import { NextRequest, NextResponse } from 'next/server'
import { assertAdminRequest } from '@/lib/admin/auth'
import { supabaseAdmin } from '@/lib/api/rest'

export async function POST(request: NextRequest) {
  try {
    const { response } = await assertAdminRequest(request)
    if (response) {
      return response
    }

    const { userId, action } = await request.json()

    if (!userId || !action) {
      return NextResponse.json({ error: 'Missing userId or action' }, { status: 400 })
    }

    if (action === 'suspend' || action === 'activate') {
      const newStatus = action === 'suspend' ? 'suspended' : 'active'

      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', userId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: `User ${newStatus} successfully`,
      })
    }

    if (action === 'delete') {
      // Delete the user account via Auth
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'User deleted successfully',
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error processing user action:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    )
  }
}
