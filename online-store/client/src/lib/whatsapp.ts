import type { CartItem } from '../cart/CartContext';
import { formatIQD } from './format';

export function buildWhatsAppOrderMessage(
  items: CartItem[],
  businessName: string,
  customerName: string,
  customerPhone: string
): string {
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const lines = [
    businessName,
    '',
    'Hello, I would like to order:',
    '',
    ...items.map((i) => `${i.quantity}x ${i.name} @ ${formatIQD(i.price)} = ${formatIQD(i.price * i.quantity)}`),
    '',
    `Total: ${formatIQD(total)}`,
  ];
  if (customerName.trim() || customerPhone.trim()) {
    lines.push('');
    if (customerName.trim()) lines.push(`Customer Name: ${customerName.trim()}`);
    if (customerPhone.trim()) lines.push(`Customer Phone: ${customerPhone.trim()}`);
  }
  return lines.join('\n');
}

// `phone` is the store's business phone number (ManagerX has no separate WhatsApp
// number field — the same number used for calls is used for WhatsApp ordering).
export function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
