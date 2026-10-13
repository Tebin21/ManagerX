import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  signLicense,
  isValidDeviceId,
  isValidPlan,
} from '@/lib/licenseCrypto';

export const dynamic = 'force-dynamic';

export interface LicenseRecord {
  id: string;
  customerName: string;
  phone: string;
  deviceId: string;
  licenseCode: string;
  plan: string;
  createdAt: string;
  activatedAt: string | null;
  expiresAt: string | null;
  status: 'active' | 'revoked' | 'expired';
  notes: string;
  revokedAt: string | null;
  revokedReason: string | null;
  isExpired: boolean;
}

// ─── GET: List all licenses ──────────────────────────────────────────────────
export async function GET() {
  try {
    const rows = (await sql`
      SELECT 
        id,
        customer_name AS "customerName",
        phone,
        device_id AS "deviceId",
        license_code AS "licenseCode",
        plan,
        status,
        created_at AS "createdAt",
        activated_at AS "activatedAt",
        expires_at AS "expiresAt",
        notes,
        revoked_at AS "revokedAt",
        revoked_reason AS "revokedReason"
      FROM licenses
      ORDER BY created_at DESC
    `) as Array<Omit<LicenseRecord, 'isExpired'>>;

    const now = Date.now();
    const licenses: LicenseRecord[] = rows.map((r) => {
      const isExp =
        r.status === 'active' &&
        !!r.expiresAt &&
        new Date(r.expiresAt).getTime() < now;
      return {
        ...r,
        isExpired: isExp,
      };
    });

    return NextResponse.json({ licenses });
  } catch (err: any) {
    console.error('Failed to list licenses:', err);
    return NextResponse.json(
      { error: err?.message || 'Database error' },
      { status: 500 }
    );
  }
}

// ─── POST: Generate & save new license ───────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerName = '', phone = '', deviceId = '', plan = 'basic', notes = '', expiresInMonths = null } = body;

    const trimmedDeviceId = (deviceId || '').trim().toUpperCase();
    if (!isValidDeviceId(trimmedDeviceId)) {
      return NextResponse.json(
        { error: 'شێوازی ئایدی ئامێر هەڵەیە (دەبێت لەم شێوازە بێت: MX-DV-XXXX-XXXX)' },
        { status: 400 }
      );
    }

    if (!isValidPlan(plan)) {
      return NextResponse.json(
        { error: 'پلانی دیاریکراو نەناسراوە' },
        { status: 400 }
      );
    }

    const monthsNum = expiresInMonths ? Number(expiresInMonths) : null;
    if (monthsNum !== null && (!Number.isFinite(monthsNum) || monthsNum <= 0)) {
      return NextResponse.json(
        { error: 'ژمارەی مانگی بەسەرچوون دەبێت ژمارەیەکی دروست بێت' },
        { status: 400 }
      );
    }

    // Check if an active license already exists for this device & plan
    const existing = await sql`
      SELECT id, license_code FROM licenses 
      WHERE device_id = ${trimmedDeviceId} AND plan = ${plan} AND status = 'active'
      LIMIT 1
    `;
    if (existing.length > 0) {
      return NextResponse.json(
        {
          error: `لایسێنسێکی چالاک بۆ ئەم ئامێرە و پلانە پێشتر دروستکراوە (${existing[0].license_code})`,
          existingLicense: existing[0].license_code,
        },
        { status: 409 }
      );
    }

    // Sign the license cryptographically
    const signed = signLicense(trimmedDeviceId, plan, monthsNum);

    // Insert into Neon Postgres
    const inserted = await sql`
      INSERT INTO licenses (
        customer_name,
        phone,
        device_id,
        license_code,
        plan,
        status,
        expires_at,
        notes
      ) VALUES (
        ${(customerName || '').trim()},
        ${(phone || '').trim()},
        ${trimmedDeviceId},
        ${signed.licenseCode},
        ${plan},
        'active',
        ${signed.expiresAt},
        ${(notes || '').trim()}
      )
      RETURNING 
        id,
        customer_name AS "customerName",
        phone,
        device_id AS "deviceId",
        license_code AS "licenseCode",
        plan,
        status,
        created_at AS "createdAt",
        activated_at AS "activatedAt",
        expires_at AS "expiresAt",
        notes,
        revoked_at AS "revokedAt",
        revoked_reason AS "revokedReason"
    `;

    const record: LicenseRecord = {
      ...(inserted[0] as any),
      isExpired: false,
    };

    return NextResponse.json({ success: true, license: record });
  } catch (err: any) {
    console.error('Failed to create license:', err);
    return NextResponse.json(
      { error: err?.message || 'Server error' },
      { status: 500 }
    );
  }
}

// ─── PATCH: Update license status or notes ──────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, revokedReason, notes, customerName, phone } = body;

    if (!id) {
      return NextResponse.json({ error: 'License ID is required' }, { status: 400 });
    }

    if (status === 'revoked') {
      await sql`
        UPDATE licenses 
        SET 
          status = 'revoked',
          revoked_at = NOW(),
          revoked_reason = ${revokedReason || 'Revoked by admin'}
        WHERE id = ${id}
      `;
    } else if (status === 'active') {
      await sql`
        UPDATE licenses 
        SET 
          status = 'active',
          revoked_at = NULL,
          revoked_reason = NULL
        WHERE id = ${id}
      `;
    }

    if (notes !== undefined) {
      await sql`UPDATE licenses SET notes = ${notes.trim()} WHERE id = ${id}`;
    }
    if (customerName !== undefined) {
      await sql`UPDATE licenses SET customer_name = ${customerName.trim()} WHERE id = ${id}`;
    }
    if (phone !== undefined) {
      await sql`UPDATE licenses SET phone = ${phone.trim()} WHERE id = ${id}`;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Failed to update license:', err);
    return NextResponse.json({ error: err?.message || 'Database error' }, { status: 500 });
  }
}

// ─── DELETE: Delete a license ───────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'License ID is required' }, { status: 400 });
    }

    await sql`DELETE FROM licenses WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Failed to delete license:', err);
    return NextResponse.json({ error: err?.message || 'Database error' }, { status: 500 });
  }
}
