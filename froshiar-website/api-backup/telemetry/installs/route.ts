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

    let installs;
    if (query) {
      const pattern = `%${query}%`;
      installs = await sql`
        SELECT
          id, device_id, platform, os_version, app_version, brand, model_name,
          first_installed_at, last_seen_at, open_count
        FROM app_telemetry_installs
        WHERE
          device_id ILIKE ${pattern} OR
          brand ILIKE ${pattern} OR
          model_name ILIKE ${pattern} OR
          platform ILIKE ${pattern}
        ORDER BY last_seen_at DESC
        LIMIT 100;
      `;
    } else {
      installs = await sql`
        SELECT
          id, device_id, platform, os_version, app_version, brand, model_name,
          first_installed_at, last_seen_at, open_count
        FROM app_telemetry_installs
        ORDER BY last_seen_at DESC
        LIMIT 100;
      `;
    }

    return NextResponse.json({ installs }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error in /api/telemetry/installs:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch installs' },
      { status: 500, headers: corsHeaders }
    );
  }
}
