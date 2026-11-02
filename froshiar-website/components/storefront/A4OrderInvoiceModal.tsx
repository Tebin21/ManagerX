'use client';

import React, { useRef } from 'react';
import { Printer, X, FileText, CheckCircle2 } from 'lucide-react';
import { formatIQD } from '@/lib/storefront/format';
import type { CartItem } from './CartContext';
import type { StoreInfo } from '@/lib/storefront/storeApi';
import { useStoreLanguage } from './StoreLanguageContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  businessName: string;
  info: StoreInfo;
  items: CartItem[];
  totalCount: number;
  totalPrice: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerNotes: string;
  orderId?: string;
}

export function A4OrderInvoiceModal({
  isOpen,
  onClose,
  businessName,
  info,
  items,
  totalCount,
  totalPrice,
  customerName,
  customerPhone,
  customerAddress,
  customerNotes,
  orderId,
}: Props) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const { t, isRTL, dir } = useStoreLanguage();

  if (!isOpen) return null;

  const invoiceNumber = orderId || `FX-${Date.now().toString().slice(-6)}`;
  const now = new Date();
  const formattedDate = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(
    now.getDate()
  ).padStart(2, '0')}`;
  const formattedTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(
    2,
    '0'
  )}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      {/* Print-specific CSS to print ONLY the A4 invoice sheet with standard margins */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-a4-order-invoice,
          #printable-a4-order-invoice * {
            visibility: visible !important;
          }
          #printable-a4-order-invoice {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 10mm 12mm !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            color: #0f172a !important;
            display: block !important;
          }
          .no-print-area {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
        }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity no-print-area"
      />

      {/* Modal Dialog Shell */}
      <div className="relative z-10 flex flex-col max-h-[92vh] w-full max-w-4xl bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Top Control Bar (Hidden on print) */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-950/90 no-print-area">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white">
                {t('a4Title')}
              </h3>
              <p className="text-[11px] text-slate-400">
                {t('a4Subtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition cursor-pointer shadow-md active:scale-95"
            >
              <Printer size={15} />
              <span>{t('a4PrintPdf')}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label={t('a4Close')}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Preview Container */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-950/60 flex justify-center">
          {/* ── THE A4 SHEET (Clean, high-contrast, black-and-gold printable paper) ── */}
          <div
            id="printable-a4-order-invoice"
            ref={invoiceRef}
            dir={dir}
            className={`w-full max-w-[760px] bg-white text-slate-900 rounded-xl sm:rounded-2xl p-6 sm:p-10 shadow-xl border border-slate-200 flex flex-col justify-between leading-relaxed ${
              isRTL ? 'font-kurdish' : 'font-sans'
            }`}
            style={{ minHeight: '920px' }}
          >
            <div>
              {/* Header: Store Name, Type, and Order Meta */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b-2 border-slate-800">
                <div>
                  <div className="inline-block px-2.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[11px] font-black uppercase tracking-wider mb-1.5">
                    {t('a4StoreInvoice')}
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                    {businessName}
                  </h1>
                  {info.address && (
                    <p className="text-xs text-slate-600 mt-1">{info.address}</p>
                  )}
                  {(info.phone || info.whatsappNumber) && (
                    <p className="text-xs text-slate-600 font-sans" dir="ltr">
                      {info.phone || info.whatsappNumber}
                    </p>
                  )}
                </div>

                <div className="sm:text-end flex flex-col sm:items-end gap-1 text-xs text-slate-600 bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-lg border sm:border-0 border-slate-200">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                    <span className="text-slate-500 text-xs">{t('a4InvoiceNo')}:</span>
                    <span className="font-sans font-black text-amber-700">#{invoiceNumber}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span>{t('a4Date')}:</span>
                    <span className="font-sans">{formattedDate}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span>{t('a4Time')}:</span>
                    <span className="font-sans">{formattedTime}</span>
                  </div>
                </div>
              </div>

              {/* Customer & Delivery Information Block */}
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                  <span>{t('a4CustomerDelivery')}</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">{t('a4CustomerName')}:</span>
                    <span className="font-bold text-slate-900">
                      {customerName.trim() || t('unspecified')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">{t('a4CustomerPhone')}:</span>
                    <span className="font-bold text-slate-900 font-sans" dir="ltr">
                      {customerPhone.trim() || t('unspecified')}
                    </span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 block text-[11px]">{t('a4DeliveryAddress')}:</span>
                    <span className="font-bold text-slate-900">
                      {customerAddress.trim() || t('unspecified')}
                    </span>
                  </div>
                  {customerNotes.trim() && (
                    <div className="sm:col-span-2 pt-2 border-t border-slate-200/80">
                      <span className="text-slate-500 block text-[11px]">
                        {t('a4CustomerNotes')}:
                      </span>
                      <span className="text-slate-800 font-medium">{customerNotes.trim()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="mt-6 overflow-hidden rounded-xl border border-slate-300">
                <table className={`w-full border-collapse text-xs ${isRTL ? 'text-right' : 'text-left'}`}>
                  <thead>
                    <tr className="bg-slate-900 text-white font-black text-[11px] uppercase tracking-wider">
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3">{t('a4ColItemName')}</th>
                      <th className="py-2.5 px-3 w-20 text-center">{t('a4ColQty')}</th>
                      <th className="py-2.5 px-3 w-28 font-sans">{t('a4ColUnitPrice')}</th>
                      <th className="py-2.5 px-3 w-32 font-sans">{t('a4ColSubtotal')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {items.map((item, idx) => {
                      const itemTotal = item.quantity * item.price;
                      return (
                        <tr
                          key={item.productId || idx}
                          className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}
                        >
                          <td className="py-2.5 px-3 text-center text-slate-500 font-bold font-sans">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{item.name}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-800 font-sans">
                            {item.quantity} {t('unit')}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-700 font-sans">
                            {formatIQD(item.price)}
                          </td>
                          <td className="py-2.5 px-3 font-black text-slate-950 font-sans">
                            {formatIQD(itemTotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Financial Summary */}
              <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-xl border-2 border-amber-500/40 bg-amber-50/50">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-amber-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-800">
                    {t('a4TotalUnits')}: <strong className="font-sans">{totalCount}</strong> {t('unit')}
                  </span>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <span className="text-sm font-black text-slate-900">{t('a4GrandTotal')}:</span>
                  <span className="text-lg sm:text-xl font-black text-amber-700 font-sans">
                    {formatIQD(totalPrice)}
                  </span>
                </div>
              </div>
            </div>

            {/* Official Document Footer */}
            <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
              <div className="text-center sm:text-start">
                <p className="font-bold text-slate-700">{t('a4ThankYou')} {businessName}!</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {t('a4GeneratedBy')}
                </p>
              </div>

              <div className="flex items-center gap-1.5 font-sans text-[11px] text-slate-600 font-semibold">
                <span>Froshiar Store System</span>
                <span>•</span>
                <span>www.froshiar.store</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
