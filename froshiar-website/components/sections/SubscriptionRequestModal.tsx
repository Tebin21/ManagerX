'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  Building2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Copy,
  Check,
  Upload,
  Image as ImageIcon,
  Trash2,
  Camera,
  CreditCard,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useLocale } from 'next-intl';
import { getClientFirestore } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

export interface PlanDetails {
  key: string;
  name: string;
  price: string;
  currency: string;
  desc: string;
}

interface SubscriptionRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: PlanDetails | null;
  locale?: string;
}

type PaymentMethodKey = 'fastpay' | 'fib' | 'zaincash';

export function SubscriptionRequestModal({
  isOpen,
  onClose,
  plan,
  locale: propLocale,
}: SubscriptionRequestModalProps) {
  const activeLocale = useLocale();
  const currentLocale = propLocale || activeLocale || 'ckb';
  const isKu = currentLocale !== 'en';

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodKey>('fastpay');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [receiptFileName, setReceiptFileName] = useState<string>('');
  const [receiptFileSize, setReceiptFileSize] = useState<string>('');

  // UI state
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen || !plan) return null;

  const paymentNumber = '0770 822 9696';
  const accountHolder = isKu ? 'تەبین فاروق عومەر' : 'Tebin Faruq Omer';

  const handleCopyNumber = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText('07708229696');
      setCopiedNumber(true);
      setTimeout(() => setCopiedNumber(false), 2200);
    }
  };

  // Image Selection & Compression Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError(isKu ? 'تکایە تەنها وێنە هەڵبژێرە (JPG, PNG, WebP)' : 'Please select an image file (JPG, PNG, WebP)');
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Compress using Canvas to maintain crispness while keeping payload lightweight
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_DIM = 1280;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.82);
          setReceiptImage(compressed);
          setReceiptFileName(file.name);
          const approxKb = Math.round((compressed.length * 0.75) / 1024);
          setReceiptFileSize(`${approxKb} KB`);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveReceipt = () => {
    setReceiptImage(null);
    setReceiptFileName('');
    setReceiptFileSize('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Resilient save handler (Primary: Firestore SDK, Fallback: Firestore REST API)
  const savePaymentRecord = async (reqId: string, payload: Record<string, any>) => {
    let savedViaSdk = false;

    // 1. Attempt Firestore Client SDK
    try {
      const db = getClientFirestore();
      if (db) {
        await setDoc(doc(db, 'payment_requests', reqId), payload);
        savedViaSdk = true;
      }
    } catch (sdkError) {
      console.warn('Firestore SDK write failed, engaging resilient REST fallback:', sdkError);
    }

    if (savedViaSdk) return;

    // 2. Resilient Fallback: Direct Firestore REST API
    const apiKey = 'AIzaSyAPt_45ZxiC6VZALYX65NN_igouWJ-Qpjo';
    const projectId = 'managerx-bac3a';
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/payment_requests?documentId=${reqId}&key=${apiKey}`;

    const restFields: Record<string, { stringValue: string }> = {};
    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined && value !== null) {
        restFields[key] = { stringValue: String(value) };
      }
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: restFields }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('Firestore REST API failure:', errBody);
      throw new Error(isKu ? 'کێشە لە پەیوەندی بە بنکەی داتاوە ڕوویدا' : 'Could not save to database');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = customerName.trim();
    const cleanPhone = phone.trim();

    if (!cleanName) {
      setError(isKu ? 'تکایە ناوی تەواو بنووسە' : 'Please enter your full name');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError(
        isKu
          ? 'تکایە ئیمەیڵێکی دروست بنووسە کە لە ناو ئەپی فرۆشیار بەکاری دەهێنیت'
          : 'Please enter a valid email that you use in the Froshiar app'
      );
      return;
    }

    if (!cleanPhone || cleanPhone.length < 8) {
      setError(isKu ? 'تکایە ژمارەی مۆبایلی دروست بنووسە' : 'Please enter a valid phone number');
      return;
    }

    // Receipt image is strictly required as requested by user
    if (!receiptImage) {
      setError(
        isKu
          ? 'تکایە وێنەی وەسڵی پارەدان (یاخود سکڕین شۆتی حەواڵەکە) دابنێ پێش ناردن'
          : 'Please upload the receipt or payment screenshot before submitting'
      );
      return;
    }

    setLoading(true);

    try {
      const reqId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const planId = plan.key === 'yearly' ? '12m' : plan.key === 'lifetime' ? 'lifetime' : '1m';

      const requestPayload = {
        id: reqId,
        customerName: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        businessName: businessName.trim() || (isKu ? 'فرۆشگا' : 'Store'),
        planId,
        planLabel: plan.name,
        amount: `${plan.price} ${plan.currency}`,
        paymentMethod:
          paymentMethod === 'fastpay'
            ? 'FastPay'
            : paymentMethod === 'fib'
            ? 'FIB'
            : 'ZainCash',
        receiptImage,
        receiptFileName: receiptFileName || 'receipt.jpg',
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      await savePaymentRecord(reqId, requestPayload);
      setIsSuccess(true);
    } catch (err: any) {
      console.error('Failed to submit subscription request:', err);
      setError(
        err?.message ||
          (isKu
            ? 'نەتوانرا داواکاری بنێردرێت، تکایە جارێکی تر هەوڵبدەرەوە'
            : 'Failed to submit request. Please try again.')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setIsSuccess(false);
    setCustomerName('');
    setEmail('');
    setPhone('');
    setBusinessName('');
    setReceiptImage(null);
    setReceiptFileName('');
    setReceiptFileSize('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white p-5 sm:p-7 shadow-2xl dark:bg-[#0E1424] dark:border dark:border-[#D4AF37]/30 border border-slate-200 transition-all custom-scrollbar"
        dir={isKu ? 'rtl' : 'ltr'}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          type="button"
          className="absolute top-4 end-4 z-10 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-white/10 dark:hover:text-white transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {isSuccess ? (
          /* ── SUCCESS STATE ── */
          <div className="text-center py-6 sm:py-8 space-y-4">
            <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-xl shadow-emerald-500/25">
              <CheckCircle2 size={44} className="stroke-[2.5]" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {isKu ? 'داواکاری و وەسڵەکەت نێردرا!' : 'Request & Receipt Submitted!'}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-md mx-auto">
                {isKu ? (
                  <>
                    سوپاس بۆ متمانەت. داواکارییەکەت و وێنەی وەسڵەکە گەیشتە دەست ئەدمین. دوای پێداچوونەوە، بەشداریکردنی پاکێجی{' '}
                    <span className="font-extrabold text-[#D4AF37]">{plan.name}</span> بە شێوەیەکی خۆکارانە لەسەر هەژماری{' '}
                    <span className="font-bold text-slate-900 dark:text-white underline" dir="ltr">{email}</span> لە ناو ئەپی فرۆشیار کارا دەکرێت.
                  </>
                ) : (
                  <>
                    Thank you! Your request and receipt proof have been delivered to the admin. Once verified, your subscription for{' '}
                    <span className="font-bold text-[#D4AF37]">{plan.name}</span> will be activated automatically for{' '}
                    <span className="font-bold text-slate-900 dark:text-white underline">{email}</span> in the app.
                  </>
                )}
              </p>
            </div>

            {/* Receipt confirmation preview */}
            {receiptImage && (
              <div className="mx-auto max-w-xs p-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/20 flex items-center gap-3 text-start">
                <img
                  src={receiptImage}
                  alt="Uploaded Receipt"
                  className="w-12 h-12 object-cover rounded-xl border border-emerald-500/30 shrink-0"
                />
                <div className="min-w-0 text-xs">
                  <p className="font-bold text-emerald-800 dark:text-emerald-300 truncate">
                    {isKu ? 'وێنەی وەسڵ تۆمارکراوە' : 'Receipt proof attached'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{receiptFileName || 'receipt.jpg'}</p>
                </div>
              </div>
            )}

            {/* Admin Support Info */}
            <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 text-xs text-amber-900 dark:text-amber-200 text-start flex items-start gap-3">
              <Info className="w-5 h-5 text-[#D4AF37] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-900 dark:text-white">
                  {isKu ? 'پشتیوانی و پەیوەندی خێرا:' : 'Quick Support & Follow-up:'}
                </p>
                <p className="mt-1 text-slate-600 dark:text-slate-300">
                  {isKu
                    ? 'لە کاتی هەر پرسیارێکدا دەتوانیت ڕاستەوخۆ پەیوەندی بکەیت بە: 0770 822 9696 (تەبین فاروق)'
                    : 'For any inquiries, feel free to contact: 0770 822 9696 (Tebin Faruq)'}
                </p>
              </div>
            </div>

            <button
              onClick={handleClose}
              type="button"
              className="w-full rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#B8860B] py-3.5 text-sm font-extrabold text-slate-950 shadow-lg shadow-[#D4AF37]/20 hover:from-[#e5bd3c] hover:to-[#c6920f] transition-all cursor-pointer"
            >
              {isKu ? 'تەواوە، داخستنی پەنجەرە' : 'Done, Close Window'}
            </button>
          </div>
        ) : (
          /* ── MAIN MODAL CONTENT ── */
          <div className="space-y-5">
            {/* Modal Header */}
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#D4AF37]/20 to-[#D4AF37]/40 text-[#D4AF37] border border-[#D4AF37]/30 shrink-0">
                <Sparkles size={24} />
              </div>
              <div className="min-w-0">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white truncate">
                  {isKu ? 'داواکاری بەشداریکردن لە فرۆشیار' : 'Froshiar Subscription Request'}
                </h3>
                <div className="flex items-center gap-2 mt-0.5 text-xs">
                  <span className="text-slate-500 dark:text-slate-400">
                    {isKu ? 'پاکێج:' : 'Plan:'}
                  </span>
                  <span className="font-bold text-[#D4AF37] px-2 py-0.5 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/25">
                    {plan.name} ({plan.price} {plan.currency})
                  </span>
                </div>
              </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* STEP 1: LUXURY PAYMENT INSTRUCTIONS HERO CARD                    */}
            {/* ════════════════════════════════════════════════════════════════ */}
            <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-[#111726] to-[#1A1F30] p-4 sm:p-5 text-white border border-[#D4AF37]/40 shadow-xl space-y-3 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-[#D4AF37]/10 blur-2xl pointer-events-none" />

              {/* Step Title Badge */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#D4AF37] text-slate-950 font-black text-xs shadow-md">
                    ١
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-[#D4AF37]">
                    {isKu ? 'سەرەتا بڕی پارەکە بنێرە بۆ ئەم ژمارەیە:' : 'Step 1: First send payment to this number:'}
                  </span>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {plan.price} {plan.currency}
                </span>
              </div>

              {/* Account Number Box with Quick Copy */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 sm:p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="space-y-0.5">
                  <p className="text-[11px] text-slate-400">
                    {isKu ? 'ناوی خاوەن هەژمار:' : 'Account Holder:'}{' '}
                    <span className="font-bold text-white">{accountHolder}</span>
                  </p>
                  <p className="text-xl sm:text-2xl font-black font-mono tracking-wider text-amber-400" dir="ltr">
                    {paymentNumber}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCopyNumber}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B8860B] hover:from-[#e5bd3c] hover:to-[#c6920f] text-slate-950 font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
                >
                  {copiedNumber ? (
                    <>
                      <Check size={14} className="stroke-[3]" />
                      <span>{isKu ? 'کۆپیکرا! ✅' : 'Copied! ✅'}</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>{isKu ? 'کۆپیکردنی ژمارە' : 'Copy Number'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Payment Methods Interactive Picker */}
              <div className="space-y-2 pt-1">
                <p className="text-[11px] text-slate-300 font-bold">
                  {isKu ? 'کامیان بەکاردەهێنیت بۆ ناردن؟ (کلیک لە یەکێکیان بکە):' : 'Select the payment method you used:'}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {/* FastPay */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('fastpay')}
                    className={`relative p-2 sm:p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      paymentMethod === 'fastpay'
                        ? 'border-[#FFB800] bg-[#FFB800]/15 shadow-md shadow-[#FFB800]/20'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    {/* FastPay SVG Icon */}
                    <div className="w-8 h-8 rounded-xl bg-[#FFB800] flex items-center justify-center shadow-md">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-slate-950 font-black">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                      </svg>
                    </div>
                    <span className="text-xs font-black text-white">FastPay</span>
                    {paymentMethod === 'fastpay' && (
                      <span className="absolute -top-1.5 -end-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#FFB800] text-slate-950 text-[10px] font-black">
                        ✓
                      </span>
                    )}
                  </button>

                  {/* FIB */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('fib')}
                    className={`relative p-2 sm:p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      paymentMethod === 'fib'
                        ? 'border-[#00A389] bg-[#00A389]/15 shadow-md shadow-[#00A389]/20'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    {/* FIB SVG Icon */}
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#008272] to-[#00A389] flex items-center justify-center shadow-md">
                      <span className="text-[11px] font-black text-white tracking-tighter">FIB</span>
                    </div>
                    <span className="text-xs font-black text-white">FIB Bank</span>
                    {paymentMethod === 'fib' && (
                      <span className="absolute -top-1.5 -end-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#00A389] text-white text-[10px] font-black">
                        ✓
                      </span>
                    )}
                  </button>

                  {/* ZainCash */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('zaincash')}
                    className={`relative p-2 sm:p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      paymentMethod === 'zaincash'
                        ? 'border-[#E6007E] bg-[#E6007E]/15 shadow-md shadow-[#E6007E]/20'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    {/* ZainCash SVG Icon */}
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#8B1874] to-[#E6007E] flex items-center justify-center shadow-md">
                      <span className="text-[10px] font-black text-white tracking-tighter">Zain</span>
                    </div>
                    <span className="text-xs font-black text-white">ZainCash</span>
                    {paymentMethod === 'zaincash' && (
                      <span className="absolute -top-1.5 -end-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#E6007E] text-white text-[10px] font-black">
                        ✓
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 rounded-2xl bg-red-50 p-3.5 text-xs font-medium text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/50">
                <AlertCircle size={17} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* STEP 2: USER ACCOUNT INFORMATION FORM                            */}
            {/* ════════════════════════════════════════════════════════════════ */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-2 pt-1">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#D4AF37] text-slate-950 font-black text-xs shadow-md">
                  ٢
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-white">
                  {isKu ? 'زانیارییەکانی هەژمار بۆ کاراکردن:' : 'Step 2: Account information for activation:'}
                </span>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isKu ? 'ناوی تەواو *' : 'Full Name *'}
                </label>
                <div className="relative">
                  <User className="absolute start-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={isKu ? 'بۆ نموونە: تەبین فاروق عومەر' : 'e.g. John Doe'}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 ps-9 pe-3 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 dark:border-slate-800 dark:bg-white/[0.04] dark:text-white transition-all"
                  />
                </div>
              </div>

              {/* App Email (Critical!) */}
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                    {isKu ? 'ئیمەیڵی هەژمار لە ناو ئەپی فرۆشیار (زۆر گرنگە) *' : 'App Account Email (Important) *'}
                  </label>
                  <span className="text-[10px] font-bold text-[#D4AF37] px-1.5 py-0.2 rounded-md bg-[#D4AF37]/10">
                    {isKu ? 'کاراکردنی خۆکار' : 'Auto-activation'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5 leading-relaxed">
                  {isKu
                    ? 'ئەم ئیمەیڵە بنووسە کە لە ناو بەرنامەی فرۆشیار پێی دەچیتە ژوورەوە؛ دوای پەسەندکردن ئەم هەژمارە ڕاستەوخۆ کارا دەبێت.'
                    : 'Enter the exact email you use to sign in to the Froshiar mobile app.'}
                </p>
                <div className="relative">
                  <Mail className="absolute start-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 ps-9 pe-3 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 dark:border-slate-800 dark:bg-white/[0.04] dark:text-white transition-all font-mono"
                  />
                </div>
              </div>

              {/* Phone & Store Name Grid */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isKu ? 'ژمارەی مۆبایل *' : 'Phone Number *'}
                  </label>
                  <div className="relative">
                    <Phone className="absolute start-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="tel"
                      required
                      dir="ltr"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0770xxxxxxx"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 ps-9 pe-3 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 dark:border-slate-800 dark:bg-white/[0.04] dark:text-white transition-all font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isKu ? 'ناوی فرۆشگا / کار' : 'Store / Business Name'}
                  </label>
                  <div className="relative">
                    <Building2 className="absolute start-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder={isKu ? 'بۆ نموونە: مارکێتی شازاد' : 'e.g. Shazad Market'}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 ps-9 pe-3 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 dark:border-slate-800 dark:bg-white/[0.04] dark:text-white transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* ══════════════════════════════════════════════════════════════ */}
              {/* STEP 3: MANDATORY RECEIPT IMAGE UPLOAD ZONE                     */}
              {/* ══════════════════════════════════════════════════════════════ */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#D4AF37] text-slate-950 font-black text-xs shadow-md">
                      ٣
                    </span>
                    <span className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-white">
                      {isKu ? 'بارکردنی وێنەی وەسڵی پارەدان (پێویستە) *' : 'Step 3: Upload Receipt Photo (Required) *'}
                    </span>
                  </div>
                  <span className="text-[10px] text-red-500 font-bold">
                    {isKu ? '* دەبێت وێنە بێت' : '* Image only'}
                  </span>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {!receiptImage ? (
                  /* Upload Button / Dropzone */
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-5 sm:p-6 rounded-3xl border-2 border-dashed border-[#D4AF37]/50 hover:border-[#D4AF37] bg-[#D4AF37]/5 hover:bg-[#D4AF37]/10 dark:bg-white/[0.02] dark:hover:bg-[#D4AF37]/10 transition-all flex flex-col items-center justify-center text-center gap-2 cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#D4AF37] to-[#F59E0B] text-slate-950 flex items-center justify-center shadow-lg shadow-[#D4AF37]/20 group-hover:scale-105 transition-transform">
                      <Camera size={22} className="stroke-[2.5]" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                        {isKu
                          ? 'کلیک لێرە بکە بۆ دانانی وێنەی وەسڵ یان گرتنی وێنە'
                          : 'Click here to upload receipt photo or take picture'}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {isKu
                          ? 'سکڕین شۆتی پارەدانی FastPay, FIB, ZainCash دابنێ'
                          : 'Upload screenshot or camera photo of the payment'}
                      </p>
                    </div>
                  </button>
                ) : (
                  /* Uploaded Image Preview Card */
                  <div className="p-3 sm:p-4 rounded-3xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 dark:bg-white/[0.04] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={receiptImage}
                        alt="Receipt Preview"
                        className="w-16 h-16 object-cover rounded-2xl border border-[#D4AF37]/40 shadow-md shrink-0"
                      />
                      <div className="min-w-0 text-xs">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                          <span className="font-extrabold text-slate-900 dark:text-white truncate">
                            {isKu ? 'وێنەی وەسڵ ئامادەیە' : 'Receipt attached'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {receiptFileName}
                        </p>
                        <span className="text-[10px] font-mono text-[#D4AF37]">{receiptFileSize}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1.5 rounded-xl border border-[#D4AF37]/40 bg-white/10 hover:bg-white/20 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                      >
                        {isKu ? 'گۆڕین' : 'Change'}
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveReceipt}
                        className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors cursor-pointer"
                        title={isKu ? 'سڕینەوە' : 'Remove'}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#B8860B] py-3.5 text-sm font-extrabold text-slate-950 shadow-xl shadow-[#D4AF37]/25 hover:from-[#e5bd3c] hover:to-[#c6920f] disabled:opacity-50 transition-all cursor-pointer active:scale-98"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin text-slate-950" />
                    <span>{isKu ? 'ناردنی داواکاری و بارکردنی وەسڵ...' : 'Submitting request & receipt...'}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={20} className="stroke-[2.5]" />
                    <span>
                      {isKu
                        ? 'ناردنی داواکاری و وەسڵ بۆ ئەدمین'
                        : 'Submit Request & Receipt to Admin'}
                    </span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
