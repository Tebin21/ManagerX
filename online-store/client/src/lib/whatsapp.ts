import type { CartItem } from '../cart/CartContext';

export function buildWhatsAppOrderMessage(
  items: CartItem[],
  businessName: string,
  customerName: string,
  customerPhone: string
): string {
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const lines = [
    'Hello,',
    '',
    'I would like to order:',
    '',
    ...items.map((i) => `${i.quantity}x ${i.name} - ${(i.price * i.quantity).toLocaleString()} IQD`),
    '',
    `Total: ${total.toLocaleString()} IQD`,
    '',
    `Customer Name: ${customerName}`,
    `Customer Phone: ${customerPhone}`,
    '',
    'Store:',
    businessName,
  ];
  return lines.join('\n');
}

export function buildWhatsAppUrl(whatsappNumber: string, message: string): string {
  const digits = whatsappNumber.replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
