'use client';

import { useState } from 'react';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  User,
  Phone,
  MapPin,
  FileEdit,
  FileText,
} from 'lucide-react';
import { useCart } from './CartContext';
import { formatIQD } from '@/lib/storefront/format';
import type { StoreInfo } from '@/lib/storefront/storeApi';
import { A4OrderInvoiceModal } from './A4OrderInvoiceModal';
import { useStoreLanguage } from './StoreLanguageContext';

function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.35A10 10 0 1 0 12 2Zm0 18.2a8.15 8.15 0 0 1-4.16-1.14l-.3-.18-3 .8.8-2.93-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.13c-.25-.12-1.45-.72-1.68-.8-.22-.08-.39-.12-.55.13-.16.25-.63.8-.78.96-.14.16-.29.18-.54.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.22-1.46-1.37-1.71-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.13-.14.17-.25.25-.4.08-.16.04-.3-.02-.43-.06-.12-.55-1.32-.75-1.81-.2-.48-.4-.41-.55-.42h-.47c-.16 0-.43.06-.65.3-.22.25-.86.84-.86 2.04 0 1.2.88 2.37 1 2.53.12.16 1.74 2.66 4.22 3.73.59.25 1.05.4 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.45-.59 1.65-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.47-.28Z" />
    </svg>
  );
}

interface Props {
  businessName: string;
  info: StoreInfo;
}

export function CartDrawer({ businessName, info }: Props) {
  const {
    items,
    totalCount,
    totalPrice,
    isOpen,
    closeCart,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();

  const { t, isRTL, dir } = useStoreLanguage();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  if (!isOpen) return null;

  const targetWhatsapp = (info.whatsappNumber || info.phone || '').trim().replace(/\D/g, '');

  const handleSendToWhatsApp = () => {
    if (items.length === 0) return;

    // Date & Time
    const now = new Date();
    const formattedDate = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(
      2,
      '0'
    )}`;

    // Numbered items without description, with quantity and pricing:
    const itemsText = items
      .map(
        (item, idx) =>
          `${idx + 1}. ${item.name}\n   ${t('whatsappQty')}: ${item.quantity} ${t('unit')} × ${formatIQD(item.price)} = ${formatIQD(
            item.quantity * item.price
          )}`
      )
      .join('\n\n');

    // Customer Information Block (placed strictly at the top):
    let customerDetails = `${t('whatsappCustomerDetails')}\n- ${t('whatsappName')}: ${customerName.trim() || t('unspecified')}\n- ${t('whatsappPhone')}: ${customerPhone.trim() || t('unspecified')}\n- ${t('whatsappAddress')}: ${customerAddress.trim() || t('unspecified')}`;
    if (customerNotes.trim()) {
      customerDetails += `\n- ${t('whatsappNotes')}: ${customerNotes.trim()}`;
    }

    // Completely clean, emoji-free WhatsApp order message
    const message = `${t('whatsappGreeting', { store: businessName })}
--------------------------------
${customerDetails}
--------------------------------
${t('whatsappItemsList')}
${itemsText}

--------------------------------
${t('whatsappTotalItems')}: ${totalCount} ${t('unit')}
${t('whatsappTotalPrice')}: ${formatIQD(totalPrice)}
--------------------------------
${t('whatsappOrderTime')}: ${formattedDate}
${t('whatsappThanks')}`;

    const whatsappUrl = targetWhatsapp
      ? `https://wa.me/${targetWhatsapp}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop */}
        <div
          onClick={closeCart}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        />

        <div className="fixed inset-y-0 end-0 flex max-w-full">
          <div
            dir={dir}
            className={`w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between dark:bg-slate-900 border-s border-slate-200 dark:border-slate-800 animate-in slide-in-from-end duration-300 ${
              isRTL ? 'font-kurdish' : 'font-sans'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                  <ShoppingBag size={18} />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">{t('cart')}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {totalCount > 0 ? `${totalCount} ${t('cartCountSuffix')}` : t('selectProductPrompt')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeCart}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition cursor-pointer border border-slate-200/80 dark:border-slate-700/80 shrink-0 whitespace-nowrap active:scale-95"
              >
                <span>{t('returnToShopping')}</span>
                <ArrowRight size={14} className="rtl:rotate-0 ltr:rotate-180 text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center py-16 text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 mb-4">
                    <ShoppingBag size={36} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                    {t('cartEmpty')}
                  </h3>
                  <p className="mt-1.5 max-w-xs text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {t('cartEmptySubtitle')}
                  </p>
                  <button
                    type="button"
                    onClick={closeCart}
                    className="mt-6 flex items-center gap-2 rounded-xl bg-[var(--brand-500,#D4AF37)] px-5 py-2.5 text-xs font-bold text-slate-950 shadow-md transition hover:brightness-105 cursor-pointer"
                  >
                    <span>{t('returnToShopping')}</span>
                    <ArrowRight size={14} className="rtl:rotate-180" />
                  </button>
                </div>
              ) : (
                <>
                  {/* Items List */}
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div
                        key={item.productId}
                        className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 transition dark:border-slate-800 dark:bg-slate-800/50"
                      >
                        {/* Image Thumbnail */}
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-900">
                          {item.imageUrl ? (
                            <>
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const fallback = e.currentTarget.nextElementSibling;
                                  if (fallback) fallback.classList.remove('hidden');
                                }}
                                className="h-full w-full object-cover"
                              />
                              <div className="hidden h-full w-full items-center justify-center text-slate-400">
                                <ShoppingBag size={20} />
                              </div>
                            </>
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-400">
                              <ShoppingBag size={20} />
                            </div>
                          )}
                        </div>

                        {/* Info & Quantity */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="truncate text-sm font-bold text-slate-900 dark:text-white">
                              {item.name}
                            </h4>
                            <button
                              type="button"
                              onClick={() => removeItem(item.productId)}
                              aria-label={t('clearCart')}
                              className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition cursor-pointer p-0.5"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {formatIQD(item.price)}
                          </p>

                          <div className="mt-2.5 flex items-center justify-between">
                            {/* Stepper */}
                            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                aria-label="Minus"
                                className="flex h-6 w-6 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 transition cursor-pointer"
                              >
                                <Minus size={12} />
                              </button>
                              <span
                                dir="ltr"
                                className="min-w-[20px] text-center font-sans text-xs font-bold text-slate-800 dark:text-slate-100"
                              >
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                aria-label="Plus"
                                className="flex h-6 w-6 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 transition cursor-pointer"
                              >
                                <Plus size={12} />
                              </button>
                            </div>

                            {/* Subtotal */}
                            <span className="text-xs font-extrabold text-[var(--brand-600,#D4AF37)]">
                              {formatIQD(item.price * item.quantity)}
                            </span>
                          </div>

                          {/* Stock ceiling warning if customer reached warehouse limit */}
                          {item.stock !== undefined && item.quantity >= item.stock && (
                            <p className="mt-1.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                              {t('maxStockReached', { count: item.stock })}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Customer Information (Ordered: Name -> Phone -> Address -> Optional Request) */}
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-800/60 space-y-3">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {t('customerInfoTitle')}
                    </p>

                    <div className="space-y-2">
                      {/* 1. Customer Name */}
                      <div className="relative">
                        <User
                          size={14}
                          className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-400 rtl:right-3 rtl:left-auto ltr:left-3 ltr:right-auto"
                        />
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder={t('customerNamePlaceholder')}
                          className="w-full rounded-xl border border-slate-200/90 bg-white py-2.5 px-8 text-xs text-slate-800 placeholder-slate-400 transition focus:border-[var(--brand-500,#D4AF37)] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[var(--brand-500,#D4AF37)] dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-[var(--brand-500,#D4AF37)] dark:focus:bg-slate-900"
                        />
                      </div>

                      {/* 2. Customer Phone */}
                      <div className="relative">
                        <Phone
                          size={14}
                          className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-400 rtl:right-3 rtl:left-auto ltr:left-3 ltr:right-auto"
                        />
                        <input
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder={t('customerPhonePlaceholder')}
                          className="w-full rounded-xl border border-slate-200/90 bg-white py-2.5 px-8 text-xs text-slate-800 placeholder-slate-400 transition focus:border-[var(--brand-500,#D4AF37)] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[var(--brand-500,#D4AF37)] dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-[var(--brand-500,#D4AF37)] dark:focus:bg-slate-900 font-sans"
                        />
                      </div>

                      {/* 3. Delivery Address */}
                      <div className="relative">
                        <MapPin
                          size={14}
                          className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-400 rtl:right-3 rtl:left-auto ltr:left-3 ltr:right-auto"
                        />
                        <input
                          type="text"
                          value={customerAddress}
                          onChange={(e) => setCustomerAddress(e.target.value)}
                          placeholder={t('customerAddressPlaceholder')}
                          className="w-full rounded-xl border border-slate-200/90 bg-white py-2.5 px-8 text-xs text-slate-800 placeholder-slate-400 transition focus:border-[var(--brand-500,#D4AF37)] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[var(--brand-500,#D4AF37)] dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-[var(--brand-500,#D4AF37)] dark:focus:bg-slate-900"
                        />
                      </div>

                      {/* 4. Optional Request / Notes */}
                      <div className="relative">
                        <FileEdit
                          size={14}
                          className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-400 rtl:right-3 rtl:left-auto ltr:left-3 ltr:right-auto"
                        />
                        <input
                          type="text"
                          value={customerNotes}
                          onChange={(e) => setCustomerNotes(e.target.value)}
                          placeholder={t('customerNotesPlaceholder')}
                          className="w-full rounded-xl border border-slate-200/90 bg-white py-2.5 px-8 text-xs text-slate-800 placeholder-slate-400 transition focus:border-[var(--brand-500,#D4AF37)] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[var(--brand-500,#D4AF37)] dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-[var(--brand-500,#D4AF37)] dark:focus:bg-slate-900"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center px-1">
                    <button
                      type="button"
                      onClick={clearCart}
                      className="text-xs font-semibold text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 transition cursor-pointer"
                    >
                      {t('clearCart')}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Footer Checkout */}
            {items.length > 0 && (
              <div className="border-t border-slate-100 bg-slate-50/80 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/90 space-y-2.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {t('total')}:
                  </span>
                  <span className="text-xl font-black text-slate-900 dark:text-white">
                    {formatIQD(totalPrice)}
                  </span>
                </div>

                {/* Primary Action: Send to WhatsApp */}
                <button
                  type="button"
                  onClick={handleSendToWhatsApp}
                  className="group flex w-full items-center justify-center gap-2.5 rounded-2xl bg-emerald-600 py-3.5 px-4 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 transition-all duration-200 hover:bg-emerald-500 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                >
                  <WhatsAppIcon size={19} />
                  <span>{t('sendWhatsApp')}</span>
                </button>

                {/* Secondary Action: Generate A4 Official Receipt */}
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white py-3 px-4 text-xs sm:text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-100 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer active:scale-[0.99]"
                >
                  <FileText size={17} className="text-amber-500 dark:text-gold-400" />
                  <span>{t('generateA4Invoice')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* A4 Order Invoice Modal */}
      <A4OrderInvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        businessName={businessName}
        info={info}
        items={items}
        totalCount={totalCount}
        totalPrice={totalPrice}
        customerName={customerName}
        customerPhone={customerPhone}
        customerAddress={customerAddress}
        customerNotes={customerNotes}
      />
    </>
  );
}
