import { NextResponse } from 'next/server'

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      message: 'Environment probe',
      environment: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET',
        key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET',
      },
    })
  } catch (error) {
    console.error('Connection test error:', error)
    return NextResponse.json(
      {
        error: 'Connection test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
