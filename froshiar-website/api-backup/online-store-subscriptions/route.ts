import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  signStoreSubscription,
  isValidDeviceId,
  OSS_PLAN_TOKENS,
} from '@/lib/licenseCrypto';

export const dynamic = 'force-dynamic';

export interface OnlineStoreSubscriptionRecord {
  id: string;
  customerName: string;
  phone: string;
  deviceId: string;
  subscriptionCode: string;
  plan: '1m' | '3m' | '6m' | '12m' | 'lifetime';
  createdAt: string;
  expiresAt: string | null;
  status: 'active' | 'revoked' | 'expired';
  notes: string;
  revokedAt: string | null;
  revokedReason: string | null;
  isExpired: boolean;
}

// ─── GET: List all store subscriptions ───────────────────────────────────────
export async function GET() {
  try {
    const rows = (await sql`
      SELECT 
        id,
        customer_name AS "customerName",
        phone,
        device_id AS "deviceId",
        subscription_code AS "subscriptionCode",
        plan,
        status,
        created_at AS "createdAt",
        expires_at AS "expiresAt",
        notes,
        revoked_at AS "revokedAt",
        revoked_reason AS "revokedReason"
      FROM online_store_subscriptions
      ORDER BY created_at DESC
    `) as Array<Omit<OnlineStoreSubscriptionRecord, 'isExpired'>>;

    const now = Date.now();
    const subscriptions: OnlineStoreSubscriptionRecord[] = rows.map((r) => {
      const isExp =
        r.status === 'active' &&
        !!r.expiresAt &&
        new Date(r.expiresAt).getTime() < now;
      return {
        ...r,
        isExpired: isExp,
      };
    });

    return NextResponse.json({ subscriptions });
  } catch (err: any) {
    console.error('Failed to list store subscriptions:', err);
    return NextResponse.json(
      { error: err?.message || 'Database error' },
      { status: 500 }
    );
  }
}

// ─── POST: Generate & save new store subscription ────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerName = '', phone = '', deviceId = '', plan = '1m', notes = '' } = body;

    const trimmedDeviceId = (deviceId || '').trim().toUpperCase();
    if (!isValidDeviceId(trimmedDeviceId)) {
      return NextResponse.json(
        { error: 'شێوازی ئایدی ئامێر هەڵەیە (دەبێت لەم شێوازە بێت: MX-DV-XXXX-XXXX)' },
        { status: 400 }
      );
    }

    if (!OSS_PLAN_TOKENS[plan]) {
      return NextResponse.json(
        { error: 'پلانی سەبسکرایپشن نەناسراوە' },
        { status: 400 }
      );
    }

    // Sign the online store subscription cryptographically
    const signed = signStoreSubscription(trimmedDeviceId, plan);

    // Insert into Neon Postgres
    const inserted = await sql`
      INSERT INTO online_store_subscriptions (
        customer_name,
        phone,
        device_id,
        subscription_code,
        plan,
        status,
        expires_at,
        notes
      ) VALUES (
        ${(customerName || '').trim()},
        ${(phone || '').trim()},
        ${trimmedDeviceId},
        ${signed.subscriptionCode},
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
        subscription_code AS "subscriptionCode",
        plan,
        status,
        created_at AS "createdAt",
        expires_at AS "expiresAt",
        notes,
        revoked_at AS "revokedAt",
        revoked_reason AS "revokedReason"
    `;

    const record: OnlineStoreSubscriptionRecord = {
      ...(inserted[0] as any),
      isExpired: false,
    };

    return NextResponse.json({ success: true, subscription: record });
  } catch (err: any) {
    console.error('Failed to create store subscription:', err);
    return NextResponse.json(
      { error: err?.message || 'Server error' },
      { status: 500 }
    );
  }
}

// ─── PATCH: Update store subscription status or notes ────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, revokedReason, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 });
    }

    if (status === 'revoked') {
      await sql`
        UPDATE online_store_subscriptions 
        SET 
          status = 'revoked',
          revoked_at = NOW(),
          revoked_reason = ${revokedReason || 'Revoked by admin'}
        WHERE id = ${id}
      `;
    } else if (status === 'active') {
      await sql`
        UPDATE online_store_subscriptions 
        SET 
          status = 'active',
          revoked_at = NULL,
          revoked_reason = NULL
        WHERE id = ${id}
      `;
    }

    if (notes !== undefined) {
      await sql`UPDATE online_store_subscriptions SET notes = ${notes.trim()} WHERE id = ${id}`;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Failed to update subscription:', err);
    return NextResponse.json({ error: err?.message || 'Database error' }, { status: 500 });
  }
}

// ─── DELETE: Delete a store subscription ─────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 });
    }

    await sql`DELETE FROM online_store_subscriptions WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Failed to delete subscription:', err);
    return NextResponse.json({ error: err?.message || 'Database error' }, { status: 500 });
  }
}
