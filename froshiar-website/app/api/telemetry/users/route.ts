import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('q')?.trim() || '';

    let users;
    if (query) {
      const pattern = `%${query}%`;
      users = await sql`
        SELECT
          id, user_id, email, phone, display_name, business_name, device_id, platform,
          app_version, created_at, last_login_at, login_count
        FROM app_telemetry_users
        WHERE
          email ILIKE ${pattern} OR
          display_name ILIKE ${pattern} OR
          business_name ILIKE ${pattern} OR
          phone ILIKE ${pattern} OR
          device_id ILIKE ${pattern}
        ORDER BY last_login_at DESC
        LIMIT 100;
      `;
    } else {
      users = await sql`
        SELECT
          id, user_id, email, phone, display_name, business_name, device_id, platform,
          app_version, created_at, last_login_at, login_count
        FROM app_telemetry_users
        ORDER BY last_login_at DESC
        LIMIT 100;
      `;
    }

    return NextResponse.json({ users }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error in /api/telemetry/users:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch users' },
      { status: 500, headers: corsHeaders }
    );
  }
}
