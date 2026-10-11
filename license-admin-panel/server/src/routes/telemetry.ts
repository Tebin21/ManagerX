import { Router } from 'express';
import { neon } from '@neondatabase/serverless';

export const telemetryRouter = Router();

const NEON_DB_URL =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_9Vad3jOmZivN@ep-rapid-silence-b2yb9trk-pooler.c-6.eu-central-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(NEON_DB_URL);

// GET /api/telemetry/stats
telemetryRouter.get('/stats', async (_req, res) => {
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
      sql`SELECT COUNT(*)::int AS count FROM app_telemetry_installs;`,
      sql`SELECT COUNT(*)::int AS count FROM app_telemetry_installs WHERE first_installed_at >= CURRENT_DATE;`,
      sql`SELECT COUNT(*)::int AS count FROM app_telemetry_installs WHERE LOWER(platform) = 'ios';`,
      sql`SELECT COUNT(*)::int AS count FROM app_telemetry_installs WHERE LOWER(platform) = 'android';`,
      sql`SELECT COALESCE(SUM(open_count), 0)::int AS count FROM app_telemetry_installs;`,
      sql`SELECT COUNT(*)::int AS count FROM app_telemetry_users;`,
      sql`SELECT COUNT(*)::int AS count FROM app_telemetry_users WHERE last_login_at >= CURRENT_DATE;`,
      sql`SELECT COUNT(*)::int AS count FROM app_telemetry_users WHERE last_login_at >= NOW() - INTERVAL '7 days';`,
      sql`SELECT id, event_type, user_email, platform, created_at FROM app_telemetry_events ORDER BY created_at DESC LIMIT 15;`,
    ]);

    return res.json({
      totalInstalls: installsCountRow[0]?.count ?? 0,
      installsToday: installsTodayRow[0]?.count ?? 0,
      iosInstalls: iosInstallsRow[0]?.count ?? 0,
      androidInstalls: androidInstallsRow[0]?.count ?? 0,
      totalOpens: totalOpensRow[0]?.count ?? 0,
      totalUsers: usersCountRow[0]?.count ?? 0,
      activeUsersToday: activeTodayRow[0]?.count ?? 0,
      activeUsers7Days: active7DaysRow[0]?.count ?? 0,
      recentEvents: recentEvents ?? [],
    });
  } catch (error: any) {
    console.error('Error fetching telemetry stats:', error);
    return res.status(500).json({ error: error?.message || 'Database error' });
  }
});

// GET /api/telemetry/users
telemetryRouter.get('/users', async (req, res) => {
  try {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';

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

    return res.json({ users });
  } catch (error: any) {
    console.error('Error fetching telemetry users:', error);
    return res.status(500).json({ error: error?.message || 'Database error' });
  }
});

// GET /api/telemetry/installs
telemetryRouter.get('/installs', async (req, res) => {
  try {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';

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

    return res.json({ installs });
  } catch (error: any) {
    console.error('Error fetching telemetry installs:', error);
    return res.status(500).json({ error: error?.message || 'Database error' });
  }
});

// POST /api/telemetry/install (Public telemetry endpoint)
telemetryRouter.post('/install', async (req, res) => {
  try {
    const { deviceId, platform, osVersion, appVersion, brand, modelName } = req.body;
    if (!deviceId) return res.status(400).json({ error: 'deviceId required' });

    const plat = (platform || 'unknown').toLowerCase();
    const osVer = osVersion || '';
    const appVer = appVersion || '1.0.0';
    const br = brand || '';
    const mod = modelName || '';

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

    await sql`
      INSERT INTO app_telemetry_events (event_type, device_id, platform, metadata)
      VALUES ('app_open', ${deviceId}, ${plat}, ${JSON.stringify({ appVersion: appVer })});
    `;

    return res.json({ success: true, install: result[0] });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Database error' });
  }
});

// POST /api/telemetry/login (Public telemetry endpoint)
telemetryRouter.post('/login', async (req, res) => {
  try {
    const { userId, email, phone, displayName, businessName, deviceId, platform, appVersion } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const plat = (platform || 'unknown').toLowerCase();
    const appVer = appVersion || '1.0.0';

    const result = await sql`
      INSERT INTO app_telemetry_users (
        user_id, email, phone, display_name, business_name, device_id, platform, app_version, last_login_at, login_count
      )
      VALUES (
        ${userId}, ${email || null}, ${phone || null}, ${displayName || null}, ${businessName || null},
        ${deviceId || null}, ${plat}, ${appVer}, NOW(), 1
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

    await sql`
      INSERT INTO app_telemetry_events (event_type, device_id, user_id, user_email, platform, metadata)
      VALUES ('login', ${deviceId || null}, ${userId}, ${email || null}, ${plat}, ${JSON.stringify({ businessName, displayName })});
    `;

    return res.json({ success: true, user: result[0] });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Database error' });
  }
});
