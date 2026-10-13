import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { getFirebaseFirestore, collection, query, where, onSnapshot } from '@/lib/firebase';

export const ADMIN_EMAILS = [
  'tebin.faruq@gmail.com',
  'tebin.232375@univsul.edu.iq',
  'demo@froshiar.store',
];

export interface PaymentRequestData {
  id: string;
  customerName: string;
  email: string;
  phone: string;
  businessName: string;
  planId: string;
  planLabel: string;
  amount: string;
  paymentMethod: string;
  notes?: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return ADMIN_EMAILS.some((adm) => adm.toLowerCase() === clean);
}

// Track seen request IDs to only notify for genuinely new or updated pending requests
const seenRequestIds = new Set<string>();
let isInitialLoad = true;

/**
 * Subscribes to pending payment requests in Firestore when the logged in user is an admin.
 * Invokes callback when a new pending payment request arrives.
 */
export function subscribeToAdminPaymentRequests(
  userEmail: string | undefined | null,
  onNewRequest: (request: PaymentRequestData) => void
): () => void {
  if (!isAdminEmail(userEmail)) {
    return () => {};
  }

  try {
    const db = getFirebaseFirestore();
    const q = query(collection(db, 'payment_requests'), where('status', '==', 'pending'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot) return;

        snapshot.docChanges().forEach((change) => {
          const data = change.doc.data() as PaymentRequestData;
          const reqId = change.doc.id || data.id;

          if (change.type === 'added') {
            if (isInitialLoad) {
              seenRequestIds.add(reqId);
            } else if (!seenRequestIds.has(reqId)) {
              seenRequestIds.add(reqId);
              // Trigger physical haptic feedback
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
              onNewRequest({ ...data, id: reqId });
            }
          }
        });

        isInitialLoad = false;
      },
      (error) => {
        console.warn('[AdminNotificationService] Snapshot error:', error);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('[AdminNotificationService] Failed to initialize listener:', err);
    return () => {};
  }
}
