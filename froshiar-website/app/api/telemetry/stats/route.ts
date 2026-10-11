import { NextResponse } from 'next/server';
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

export async function GET() {
  try {
    const [
      installsCountRow,
      installsTodayRow,
      iosInstallsRow,
      androidInstallsRow,
      totalOpensRow,
      usersCountRow,
      activeTodayRow,
      active7DaysRow,
      recentEvents,
    ] = await Promise.all([
      // Total installs
      sql`SELECT COUNT(*)::int AS count FROM app_telemetry_installs;`,
      // Installs today
      sql`SELECT COUNT(*)::int AS count FROM app_telemetry_installs WHERE first_installed_at >= CURRENT_DATE;`,
      // iOS
      sql`SELECT COUNT(*)::int AS count FROM app_telemetry_installs WHERE LOWER(platform) = 'ios';`,
      // Android
      sql`SELECT COUNT(*)::int AS count FROM app_telemetry_installs WHERE LOWER(platform) = 'android';`,
      // Total opens / launches
      sql`SELECT COALESCE(SUM(open_count), 0)::int AS count FROM app_telemetry_installs;`,
      // Total users
      sql`SELECT COUNT(*)::int AS count FROM app_telemetry_users;`,
      // Active users today
      sql`SELECT COUNT(*)::int AS count FROM app_telemetry_users WHERE last_login_at >= CURRENT_DATE;`,
      // Active users last 7 days
      sql`SELECT COUNT(*)::int AS count FROM app_telemetry_users WHERE last_login_at >= NOW() - INTERVAL '7 days';`,
      // Recent events
      sql`SELECT id, event_type, user_email, platform, created_at FROM app_telemetry_events ORDER BY created_at DESC LIMIT 15;`,
    ]);

    return NextResponse.json(
      {
        totalInstalls: installsCountRow[0]?.count ?? 0,
        installsToday: installsTodayRow[0]?.count ?? 0,
        iosInstalls: iosInstallsRow[0]?.count ?? 0,
        androidInstalls: androidInstallsRow[0]?.count ?? 0,
        totalOpens: totalOpensRow[0]?.count ?? 0,
        totalUsers: usersCountRow[0]?.count ?? 0,
        activeUsersToday: activeTodayRow[0]?.count ?? 0,
        activeUsers7Days: active7DaysRow[0]?.count ?? 0,
        recentEvents: recentEvents ?? [],
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error in /api/telemetry/stats:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch telemetry stats' },
      { status: 500, headers: corsHeaders }
    );
  }
}
