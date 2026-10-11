import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      email,
      phone,
      displayName,
      businessName,
      deviceId,
      platform,
      appVersion,
    } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const plat = (platform || 'unknown').toLowerCase();
    const appVer = appVersion || '1.0.0';
    const em = email || null;
    const ph = phone || null;
    const dName = displayName || null;
    const bName = businessName || null;
    const devId = deviceId || null;

    // Upsert into app_telemetry_users
    const result = await sql`
      INSERT INTO app_telemetry_users (
        user_id, email, phone, display_name, business_name, device_id, platform, app_version, last_login_at, login_count
      )
      VALUES (
        ${userId}, ${em}, ${ph}, ${dName}, ${bName}, ${devId}, ${plat}, ${appVer}, NOW(), 1
      )
      ON CONFLICT (user_id)
      DO UPDATE SET
        last_login_at = NOW(),
        login_count = app_telemetry_users.login_count + 1,
        email = COALESCE(EXCLUDED.email, app_telemetry_users.email),
        phone = COALESCE(EXCLUDED.phone, app_telemetry_users.phone),
        display_name = COALESCE(EXCLUDED.display_name, app_telemetry_users.display_name),
        business_name = COALESCE(EXCLUDED.business_name, app_telemetry_users.business_name),
        device_id = COALESCE(EXCLUDED.device_id, app_telemetry_users.device_id),
        platform = COALESCE(EXCLUDED.platform, app_telemetry_users.platform),
        app_version = EXCLUDED.app_version
      RETURNING *;
    `;

    // Log telemetry event
    await sql`
      INSERT INTO app_telemetry_events (
        event_type, device_id, user_id, user_email, platform, metadata
      )
      VALUES (
        'login',
        ${devId},
        ${userId},
        ${em},
        ${plat},
        ${JSON.stringify({ businessName: bName, displayName: dName, appVersion: appVer })}
      );
    `;

    return NextResponse.json(
      { success: true, user: result[0] },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error in /api/telemetry/login:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal Server Error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
