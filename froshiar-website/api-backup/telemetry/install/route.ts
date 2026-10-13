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
    const { deviceId, platform, osVersion, appVersion, brand, modelName } = body;

    if (!deviceId) {
      return NextResponse.json(
        { error: 'deviceId is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const plat = (platform || 'unknown').toLowerCase();
    const osVer = osVersion || '';
    const appVer = appVersion || '1.0.0';
    const br = brand || '';
    const mod = modelName || '';

    // Upsert into app_telemetry_installs
    const result = await sql`
      INSERT INTO app_telemetry_installs (
        device_id, platform, os_version, app_version, brand, model_name, last_seen_at, open_count
      )
      VALUES (
        ${deviceId}, ${plat}, ${osVer}, ${appVer}, ${br}, ${mod}, NOW(), 1
      )
      ON CONFLICT (device_id)
      DO UPDATE SET
        last_seen_at = NOW(),
        open_count = app_telemetry_installs.open_count + 1,
        app_version = EXCLUDED.app_version,
        os_version = EXCLUDED.os_version,
        model_name = COALESCE(EXCLUDED.model_name, app_telemetry_installs.model_name)
      RETURNING *;
    `;

    // Log telemetry event
    await sql`
      INSERT INTO app_telemetry_events (
        event_type, device_id, platform, metadata
      )
      VALUES (
        'app_open',
        ${deviceId},
        ${plat},
        ${JSON.stringify({ appVersion: appVer, osVersion: osVer })}
      );
    `;

    return NextResponse.json(
      { success: true, install: result[0] },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error in /api/telemetry/install:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal Server Error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
