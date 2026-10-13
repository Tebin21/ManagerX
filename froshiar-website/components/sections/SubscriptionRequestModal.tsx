'use client';

import React, { useState } from 'react';
import {
  X,
  CreditCard,
  User,
  Mail,
  Phone,
  Building2,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';
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

export function SubscriptionRequestModal({
  isOpen,
  onClose,
  plan,
  locale = 'ckb',
}: SubscriptionRequestModalProps) {
  const isKu = locale !== 'en';

  const [customerName, setCustomerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'fastpay' | 'fib' | 'zaincash' | 'cash'>('fastpay');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen || !plan) return null;

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
          ? 'تکایە ئیمەیڵێکی دروست بنووسە کە لە ناو ئەپ بەکاری دەهێنیت'
          : 'Please enter a valid email that you use in the Froshiar app'
      );
      return;
    }

    if (!cleanPhone || cleanPhone.length < 8) {
      setError(isKu ? 'تکایە ژمارەی مۆبایلی دروست بنووسە' : 'Please enter a valid phone number');
      return;
    }

    setLoading(true);

    try {
      const db = getClientFirestore();
      if (!db) {
        throw new Error(isKu ? 'کێشە لە پەیوەندی بە بنکەی داتاوە ڕوویدا' : 'Could not connect to database');
      }

      const reqId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const planId = plan.key === 'yearly' ? '12m' : plan.key === 'lifetime' ? 'lifetime' : '1m';

      const requestPayload = {
        id: reqId,
        customerName: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        businessName: businessName.trim() || 'فرۆشگا',
        planId,
        planLabel: plan.name,
        amount: `${plan.price} ${plan.currency}`,
        paymentMethod:
          paymentMethod === 'fastpay'
            ? 'FastPay'
            : paymentMethod === 'fib'
            ? 'FIB'
            : paymentMethod === 'zaincash'
            ? 'ZainCash'
            : 'Cash',
        notes: notes.trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'payment_requests', reqId), requestPayload);

      setIsSuccess(true);
    } catch (err: any) {
      console.error('Failed to submit subscription request:', err);
      setError(err?.message || (isKu ? 'نەتوانرا داواکاری بنێردرێت، دووبارە هەوڵبدەرەوە' : 'Failed to submit request'));
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
    setNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#151a24] dark:border dark:border-gold-900/40 sm:p-8"
        dir={isKu ? 'rtl' : 'ltr'}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          type="button"
          className="absolute top-5 end-5 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        {isSuccess ? (
          <div className="text-center py-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="mt-4 text-2xl font-bold text-ink dark:text-white">
              {isKu ? 'داواکارییەکەت بە سەرکەوتوویی تۆمارکرا!' : 'Request Submitted Successfully!'}
            </h3>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {isKu ? (
                <>
                  سوپاس بۆ متمانەت. داواکارییەکەت ڕەوانەی ئەدمینی فرۆشیار کرا. دوای پشتڕاستکردنەوە، بەشداریکردنەکەت بە شێوەیەکی خۆکارانە لەسەر هەژماری ئیمەیڵی{' '}
                  <span className="font-bold text-gold-600 dark:text-gold-400" dir="ltr">{email}</span> لە ناو ئەپەکە کارا دەبێت.
                </>
              ) : (
                <>
                  Thank you! Your request has been sent to Froshiar admin. Once reviewed, your subscription will be automatically activated for{' '}
                  <span className="font-bold text-gold-600 dark:text-gold-400">{email}</span> in the app.
                </>
              )}
            </p>

            <div className="mt-6 rounded-2xl bg-gold-50/70 p-4 border border-gold-200/60 dark:bg-gold-950/20 dark:border-gold-900/40 text-xs text-gold-800 dark:text-gold-300 text-start">
              <p className="font-bold">{isKu ? 'زانیاری پەیوەندی و پێداچوونەوە:' : 'Contact & Review:'}</p>
              <p className="mt-1">{isKu ? 'ژمارەی ئەدمین: 0770 822 9696 (تەبین فاروق)' : 'Admin Phone: 0770 822 9696'}</p>
            </div>

            <button
              onClick={handleClose}
              type="button"
              className="mt-6 w-full rounded-2xl bg-gradient-to-r from-gold-500 to-amber-500 py-3 text-sm font-bold text-ink-fixed shadow-md hover:from-gold-400 hover:to-amber-400 transition-all"
            >
              {isKu ? 'تەواوە، داخستن' : 'Done, Close'}
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-100 text-gold-700 dark:bg-gold-900/40 dark:text-gold-300">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-ink dark:text-white">
                  {isKu ? 'داواکاری بەشداریکردن لە فرۆشیار' : 'Subscription Request'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {isKu ? 'پاکجی هەڵبژێردراو:' : 'Selected Plan:'}{' '}
                  <span className="font-bold text-gold-600 dark:text-gold-400">
                    {plan.name} ({plan.price} {plan.currency})
                  </span>
                </p>
              </div>
            </div>

            {/* Payment reminder banner */}
            <div className="mt-4 rounded-2xl bg-slate-50 p-3.5 border border-slate-200/80 dark:bg-white/[0.03] dark:border-slate-800 text-xs text-gray-600 dark:text-gray-300">
              <p className="font-bold text-ink dark:text-white mb-1">
                {isKu ? 'شێوازەکانی ناردنی بڕی پارە (تەبین فاروق):' : 'Payment Accounts (Tebin Faruq):'}
              </p>
              <div className="flex flex-wrap gap-2 text-xs font-mono">
                <span className="rounded-lg bg-white px-2.5 py-1 border border-slate-200 dark:bg-slate-900 dark:border-slate-700">
                  FastPay / FIB / ZainCash: <b className="text-gold-600 dark:text-gold-400">0770 822 9696</b>
                </span>
              </div>
            </div>

            {error && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-200/60 dark:border-red-900/40">
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  {isKu ? 'ناوی تەواو *' : 'Full Name *'}
                </label>
                <div className="relative">
                  <User className="absolute start-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={isKu ? 'بۆ نموونە: تەبین فاروق' : 'e.g. John Doe'}
                    className="w-full rounded-xl border border-gray-200 bg-white ps-9 pe-3 py-2.5 text-xs sm:text-sm text-ink outline-hidden focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 dark:border-gray-800 dark:bg-white/5 dark:text-white"
                  />
                </div>
              </div>

              {/* Account Email (Crucial!) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-0.5">
                  {isKu ? 'ئیمەیڵی هەژمار لە ناو ئەپ (زۆر گرنگە) *' : 'App Account Email (Important) *'}
                </label>
                <p className="text-[11px] text-gray-400 dark:text-gray-400 mb-1">
                  {isKu
                    ? 'ئەم ئیمەیڵە بنووسە کە لە ناو بەرنامەی فرۆشیار پێی دەچیتە ژوورەوە بۆ ئەوەی ڕاستەوخۆ کارا بێت.'
                    : 'The email address you use to sign in to the Froshiar mobile app.'}
                </p>
                <div className="relative">
                  <Mail className="absolute start-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full rounded-xl border border-gray-200 bg-white ps-9 pe-3 py-2.5 text-xs sm:text-sm text-ink outline-hidden focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 dark:border-gray-800 dark:bg-white/5 dark:text-white"
                  />
                </div>
              </div>

              {/* Phone & Business Grid */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    {isKu ? 'ژمارەی مۆبایل *' : 'Phone Number *'}
                  </label>
                  <div className="relative">
                    <Phone className="absolute start-3 top-3 h-4 w-4 text-gray-400" />
                    <input
                      type="tel"
                      required
                      dir="ltr"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0770xxxxxxx"
                      className="w-full rounded-xl border border-gray-200 bg-white ps-9 pe-3 py-2.5 text-xs sm:text-sm text-ink outline-hidden focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 dark:border-gray-800 dark:bg-white/5 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    {isKu ? 'ناوی فرۆشگا / کار' : 'Store / Business Name'}
                  </label>
                  <div className="relative">
                    <Building2 className="absolute start-3 top-3 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder={isKu ? 'بۆ نموونە: مۆبایلی کاروان' : 'e.g. My Shop'}
                      className="w-full rounded-xl border border-gray-200 bg-white ps-9 pe-3 py-2.5 text-xs sm:text-sm text-ink outline-hidden focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 dark:border-gray-800 dark:bg-white/5 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  {isKu ? 'شێوازی ناردنی پارە' : 'Payment Method'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('fastpay')}
                    className={`rounded-xl border p-2 text-xs font-bold transition-all ${
                      paymentMethod === 'fastpay'
                        ? 'border-gold-500 bg-gold-50 text-gold-700 dark:bg-gold-950/40 dark:text-gold-300'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-white/5 dark:text-gray-300'
                    }`}
                  >
                    FastPay
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('fib')}
                    className={`rounded-xl border p-2 text-xs font-bold transition-all ${
                      paymentMethod === 'fib'
                        ? 'border-gold-500 bg-gold-50 text-gold-700 dark:bg-gold-950/40 dark:text-gold-300'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-white/5 dark:text-gray-300'
                    }`}
                  >
                    FIB
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('zaincash')}
                    className={`rounded-xl border p-2 text-xs font-bold transition-all ${
                      paymentMethod === 'zaincash'
                        ? 'border-gold-500 bg-gold-50 text-gold-700 dark:bg-gold-950/40 dark:text-gold-300'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-white/5 dark:text-gray-300'
                    }`}
                  >
                    ZainCash
                  </button>
                </div>
              </div>

              {/* Transaction ID / Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  {isKu ? 'تێبینی یان کۆدی وەسڵ / ژمارەی حەواڵە' : 'Transaction ID / Notes'}
                </label>
                <div className="relative">
                  <FileText className="absolute start-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={isKu ? 'کۆدی مامەڵە یان کاتی ناردنی پارە بنووسە' : 'Transaction reference or note'}
                    className="w-full rounded-xl border border-gray-200 bg-white ps-9 pe-3 py-2.5 text-xs sm:text-sm text-ink outline-hidden focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 dark:border-gray-800 dark:bg-white/5 dark:text-white"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold-500 to-amber-500 py-3 text-sm font-bold text-ink-fixed shadow-md hover:from-gold-400 hover:to-amber-400 disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>{isKu ? 'ناردنی داواکاری...' : 'Submitting...'}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    <span>{isKu ? 'ناردنی داواکاری بۆ کاراکردن' : 'Submit Subscription Request'}</span>
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
