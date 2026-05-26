import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/api/rest'

/**
 * Test endpoint to diagnose wallet transaction constraint issues
 * GET /api/debug/wallet-insert-test?userId=<uuid>
 */
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId')
  
  if (!userId) {
    return NextResponse.json({ error: 'userId query param required' }, { status: 400 })
  }

  try {
    // Test 1: Check if user exists
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (profileError) {
      return NextResponse.json({ 
        error: 'Profile query failed',
        details: profileError.message 
      }, { status: 500 })
    }

    if (!profile) {
      return NextResponse.json({ 
        error: 'User not found'
      }, { status: 404 })
    }

    // Test 2: Check transaction table schema
    const testReference = `TEST-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const testPayload = {
      user_id: userId,
      type: 'wallet',
      amount: 10.00,
      status: 'success',
      description: 'Test wallet transaction',
      reference: testReference,
      wallet_applied: false,
      metadata: {
        test: true,
        timestamp: new Date().toISOString(),
      },
    }

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('transactions')
      .insert(testPayload)
      .select('id')
      .single()

    if (insertError) {
      // Clean up the test reference if it was partially inserted
      try {
        await supabaseAdmin
          .from('transactions')
          .delete()
          .eq('reference', testReference)
      } catch (_) {
        // Ignore cleanup errors
      }

      return NextResponse.json({
        error: 'Transaction insert failed',
        details: insertError.message,
        code: insertError.code,
        details_full: insertError,
        payload: testPayload,
      }, { status: 400 })
    }

    // Clean up test transaction
    await supabaseAdmin
      .from('transactions')
      .delete()
      .eq('id', inserted.id)

    return NextResponse.json({
      success: true,
      message: 'Wallet transaction insert test passed',
      details: {
        userExists: true,
        canInsertWalletType: true,
        testedPayload: testPayload,
      },
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Test failed with exception',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}
