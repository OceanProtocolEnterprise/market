// app/api/dfns/get-token.ts (optional - for displaying token)
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('dfns_token')?.value

  if (!token) {
    return NextResponse.json({ error: 'No token found' }, { status: 401 })
  }

  // Only return token for development/demo purposes
  // In production, you might want to return only a partial token or mask it
  return NextResponse.json({ token })
}
