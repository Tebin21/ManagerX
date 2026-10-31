'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Image as ImageIcon,
  Smartphone,
  Tablet,
  Monitor,
  Type,
  Plus,
  Trash2,
  Edit3,
  Save,
  RotateCcw,
  Check,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  Layers,
  Eye,
  Upload,
  Link as LinkIcon,
  Sparkles,
  AlertCircle,
  Clock,
  Play,
  Pause,
  ExternalLink,
} from 'lucide-react';
import { getClientFirestore } from '@/lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export interface RemoteBannerConfig {
  mobileBannerUrl: string;
  ipadBannerUrl: string;
  largeBannerUrl: string;
  kurdishPhrases: string[];
  englishPhrases: string[];
  typingSpeed?: number;
  deletingSpeed?: number;
  holdDuration?: number;
  updatedAt?: string;
  updatedBy?: string;
}

const DEFAULT_KURDISH_PHRASES = [
  'فرۆشیار',
  'لەگەڵ فرۆشیار فرۆشتنەکانت ئاسانتر بکە',
  'فرۆشیار پێشکەش بە تۆیە',
];

const DEFAULT_ENGLISH_PHRASES = [
  'Froshiar',
  'Make your sales easier with Froshiar',
  'Froshiar is dedicated to you',
];

interface HeroBannerManagementProps {
  isDarkMode: boolean;
  language: 'ku' | 'en';
}

export default function HeroBannerManagement({
  isDarkMode,
  language,
}: HeroBannerManagementProps) {
  const isKurdish = language === 'ku';

  // Config State
  const [mobileBannerUrl, setMobileBannerUrl] = useState('');
  const [ipadBannerUrl, setIpadBannerUrl] = useState('');
  const [largeBannerUrl, setLargeBannerUrl] = useState('');
  const [kurdishPhrases, setKurdishPhrases] = useState<string[]>(DEFAULT_KURDISH_PHRASES);
  const [englishPhrases, setEnglishPhrases] = useState<string[]>(DEFAULT_ENGLISH_PHRASES);
  const [holdDuration, setHoldDuration] = useState<number>(5000);
  const [typingSpeed, setTypingSpeed] = useState<number>(70);

  // New phrase inputs
  const [newKuPhrase, setNewKuPhrase] = useState('');
  const [newEnPhrase, setNewEnPhrase] = useState('');

  // Editing phrase indexes
  const [editingKuIdx, setEditingKuIdx] = useState<number | null>(null);
  const [editKuText, setEditKuText] = useState('');
  const [editingEnIdx, setEditingEnIdx] = useState<number | null>(null);
  const [editEnText, setEditEnText] = useState('');

  // UI / Status states
  const [activeDeviceTab, setActiveDeviceTab] = useState<'mobile' | 'tablet' | 'large'>('mobile');
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'tablet' | 'large'>('mobile');
  const [previewLanguage, setPreviewLanguage] = useState<'ku' | 'en'>('ku');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Live Typewriter Preview engine in React
  const [typewriterText, setTypewriterText] = useState('');
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // Active phrases for preview
  const currentPreviewPhrases = useMemo(() => {
    if (previewLanguage === 'ku') {
      return kurdishPhrases.length > 0 ? kurdishPhrases : DEFAULT_KURDISH_PHRASES;
    }
    return englishPhrases.length > 0 ? englishPhrases : DEFAULT_ENGLISH_PHRASES;
  }, [previewLanguage, kurdishPhrases, englishPhrases]);

  // Typing animation loop for live preview
  useEffect(() => {
    if (currentPreviewPhrases.length === 0) return;
    const currentPhrase = currentPreviewPhrases[phraseIdx % currentPreviewPhrases.length] || '';

    let timer: NodeJS.Timeout;
    if (!isDeleting) {
      if (typewriterText.length < currentPhrase.length) {
        timer = setTimeout(() => {
          setTypewriterText(currentPhrase.slice(0, typewriterText.length + 1));
        }, typingSpeed);
      } else {
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, holdDuration);
      }
    } else {
      if (typewriterText.length > 0) {
        timer = setTimeout(() => {
          setTypewriterText(currentPhrase.slice(0, typewriterText.length - 1));
        }, 35);
      } else {
        timer = setTimeout(() => {
          setIsDeleting(false);
          setPhraseIdx((prev) => (prev + 1) % currentPreviewPhrases.length);
        }, 500);
      }
    }

    return () => clearTimeout(timer);
  }, [typewriterText, isDeleting, phraseIdx, currentPreviewPhrases, typingSpeed, holdDuration]);

  // Reset preview typing when preview language or phrases change
  useEffect(() => {
    setTypewriterText('');
    setIsDeleting(false);
    setPhraseIdx(0);
  }, [previewLanguage, kurdishPhrases, englishPhrases]);

  // ─── 1. Fetch & Subscribe from Firestore ────────────────────────────────────
  useEffect(() => {
    const db = getClientFirestore();
    if (!db) {
      setIsLoading(false);
      setErrorMessage(isKurdish ? 'هێڵی فایەربەیس بەردەست نییە' : 'Firebase not connected');
      return;
    }

    const docRef = doc(db, 'app_config', 'dashboard_banner');
    const unsub = onSnapshot(
      docRef,
      (snapshot) => {
        setIsLoading(false);
        if (snapshot.exists()) {
          const data = snapshot.data() as RemoteBannerConfig;
          if (data.mobileBannerUrl !== undefined) setMobileBannerUrl(data.mobileBannerUrl || '');
          if (data.ipadBannerUrl !== undefined) setIpadBannerUrl(data.ipadBannerUrl || '');
          if (data.largeBannerUrl !== undefined) setLargeBannerUrl(data.largeBannerUrl || '');
          if (Array.isArray(data.kurdishPhrases) && data.kurdishPhrases.length > 0) {
            setKurdishPhrases(data.kurdishPhrases);
          }
          if (Array.isArray(data.englishPhrases) && data.englishPhrases.length > 0) {
            setEnglishPhrases(data.englishPhrases);
          }
          if (data.holdDuration) setHoldDuration(data.holdDuration);
          if (data.typingSpeed) setTypingSpeed(data.typingSpeed);
          if (data.updatedAt) setLastUpdated(data.updatedAt);
        }
      },
      (err) => {
        console.error('Error fetching banner config:', err);
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, [isKurdish]);

  // ─── 2. Client-side Image Compression / Upload to Data URL ──────────────────
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'mobile' | 'tablet' | 'large'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (< 5MB before compress)
    if (file.size > 5 * 1024 * 1024) {
      alert(isKurdish ? 'قەبارەی وێنەکە لە ٥ مێگابایت زیاترە، تکایە وێنەیەکی بچووکتر دیاری بکە.' : 'File too large (> 5MB). Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Target max dimension
        const maxDim = target === 'large' ? 1600 : target === 'tablet' ? 1200 : 900;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, width, height);
        // Compress as clean JPEG
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);

        if (target === 'mobile') setMobileBannerUrl(compressedBase64);
        else if (target === 'tablet') setIpadBannerUrl(compressedBase64);
        else setLargeBannerUrl(compressedBase64);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // ─── 3. Save to Firestore ───────────────────────────────────────────────────
  const handleSaveToCloud = async () => {
    const db = getClientFirestore();
    if (!db) {
      setErrorMessage(isKurdish ? 'پەیوەندی بە فایەربەیس نییە' : 'Cannot reach Firebase');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const docRef = doc(db, 'app_config', 'dashboard_banner');
      const payload: RemoteBannerConfig = {
        mobileBannerUrl: mobileBannerUrl.trim(),
        ipadBannerUrl: ipadBannerUrl.trim(),
        largeBannerUrl: largeBannerUrl.trim(),
        kurdishPhrases: kurdishPhrases.filter((p) => p.trim().length > 0),
        englishPhrases: englishPhrases.filter((p) => p.trim().length > 0),
        typingSpeed,
        holdDuration,
        updatedAt: new Date().toISOString(),
        updatedBy: 'Admin Panel',
      };

      await setDoc(docRef, payload, { merge: true });

      setSaveSuccess(true);
      setLastUpdated(payload.updatedAt || null);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error('Failed to save banner config:', err);
      setErrorMessage(err.message || (isKurdish ? 'هەڵەیەک ڕوویدا لە کاتی پاشەکەوتکردن' : 'Failed to save configuration'));
    } finally {
      setIsSaving(false);
    }
  };

  // ─── 4. Reset to Default Values ─────────────────────────────────────────────
  const handleResetDefaults = () => {
    if (confirm(isKurdish ? 'ئایا دڵنیایت لە گەڕاندنەوەی سەرجەم ڕێکخستنەکان بۆ دۆخی سەرەتایی؟' : 'Are you sure you want to reset everything to default values?')) {
      setMobileBannerUrl('');
      setIpadBannerUrl('');
      setLargeBannerUrl('');
      setKurdishPhrases(DEFAULT_KURDISH_PHRASES);
      setEnglishPhrases(DEFAULT_ENGLISH_PHRASES);
      setHoldDuration(5000);
      setTypingSpeed(70);
    }
  };

  // Phrase helpers
  const handleAddKuPhrase = () => {
    if (!newKuPhrase.trim()) return;
    setKurdishPhrases((prev) => [...prev, newKuPhrase.trim()]);
    setNewKuPhrase('');
  };

  const handleAddEnPhrase = () => {
    if (!newEnPhrase.trim()) return;
    setEnglishPhrases((prev) => [...prev, newEnPhrase.trim()]);
    setNewEnPhrase('');
  };

  const handleMovePhrase = (type: 'ku' | 'en', index: number, direction: 'up' | 'down') => {
    const list = type === 'ku' ? [...kurdishPhrases] : [...englishPhrases];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    if (type === 'ku') setKurdishPhrases(list);
    else setEnglishPhrases(list);
  };

  const handleDeletePhrase = (type: 'ku' | 'en', index: number) => {
    if (type === 'ku') {
      if (kurdishPhrases.length <= 1) {
        alert(isKurdish ? 'دەبێت لانیکەم یەک دەستەواژە بمێنێتەوە' : 'At least one phrase is required');
        return;
      }
      setKurdishPhrases((prev) => prev.filter((_, i) => i !== index));
    } else {
      if (englishPhrases.length <= 1) {
        alert(isKurdish ? 'دەبێت لانیکەم یەک دەستەواژە بمێنێتەوە' : 'At least one phrase is required');
        return;
      }
      setEnglishPhrases((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // Active preview image based on previewDevice
  const activePreviewImage = useMemo(() => {
    if (previewDevice === 'large' && largeBannerUrl) return largeBannerUrl;
    if (previewDevice === 'tablet' && (ipadBannerUrl || largeBannerUrl)) return ipadBannerUrl || largeBannerUrl;
    if (mobileBannerUrl) return mobileBannerUrl;
    return null; // indicates default fallback
  }, [previewDevice, largeBannerUrl, ipadBannerUrl, mobileBannerUrl]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ─── Top Header Card ──────────────────────────────────────────────── */}
      <div
        className={`p-5 sm:p-6 rounded-2xl border transition-all ${
          isDarkMode
            ? 'bg-[#141C2E] border-slate-800 text-white'
            : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20 shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                  {isKurdish ? 'بەڕێوەبردنی بانەری سەرەکی ئەپ' : 'Hero Banner & Typewriter Management'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  {isKurdish ? 'ڕاستەوخۆ (Live Sync)' : 'Live Sync'}
                </span>
              </div>
              <p
                className={`text-xs sm:text-sm mt-1 ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                {isKurdish
                  ? 'گۆڕینی وێنەی سابتی بانەر بەپێی قەبارەی ئامێر (مۆبایل، ئایپاد، شاشەی گەورە) و ڕێکخستنی دەستەواژەکانی تایپینگ بە ئۆتۆماتیکی بۆ هەموو بەکارهێنەران'
                  : 'Customize default hero banner images for Mobile, iPad, Large Screens, and animated typewriter phrases across all mobile devices.'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
            <button
              onClick={handleResetDefaults}
              disabled={isSaving}
              className={`px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                isDarkMode
                  ? 'border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                  : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              <span>{isKurdish ? 'سەرەتایی' : 'Reset'}</span>
            </button>

            <button
              onClick={handleSaveToCloud}
              disabled={isSaving}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shadow-lg cursor-pointer ${
                saveSuccess
                  ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20'
              }`}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>{isKurdish ? 'پاشەکەوت دەکرێت...' : 'Saving...'}</span>
                </>
              ) : saveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isKurdish ? 'سەرکەوتووانە بڵاوکرایەوە!' : 'Synced to All Devices!'}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isKurdish ? 'پاشەکەوتکردن لە کڵاود' : 'Save to Cloud'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs sm:text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Last updated indicator */}
        {lastUpdated && (
          <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            <span>
              {isKurdish ? 'دوایین نوێکردنەوە لە کڵاود:' : 'Last Synced:'}{' '}
              {new Date(lastUpdated).toLocaleString(isKurdish ? 'ckb' : 'en-US')}
            </span>
          </div>
        )}
      </div>

      {/* ─── LIVE INTERACTIVE PREVIEW CARD ─────────────────────────────────── */}
      <div
        className={`p-5 sm:p-6 rounded-2xl border transition-all ${
          isDarkMode
            ? 'bg-[#141C2E] border-slate-800'
            : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-amber-500" />
            <h2 className="text-base sm:text-lg font-bold">
              {isKurdish ? 'پێشبینینی ڕاستەوخۆ لە ناو ئەپ (Live Mockup)' : 'Live App Mockup Preview'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Language toggle for preview */}
            <div
              className={`p-1 rounded-xl border flex items-center text-xs font-semibold ${
                isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <button
                onClick={() => setPreviewLanguage('ku')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  previewLanguage === 'ku'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : isDarkMode
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                کوردی
              </button>
              <button
                onClick={() => setPreviewLanguage('en')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  previewLanguage === 'en'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : isDarkMode
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                English
              </button>
            </div>

            {/* Device selector for preview */}
            <div
              className={`p-1 rounded-xl border flex items-center text-xs font-semibold ${
                isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <button
                onClick={() => setPreviewDevice('mobile')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  previewDevice === 'mobile'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : isDarkMode
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>{isKurdish ? 'مۆبایل' : 'Phone'}</span>
              </button>
              <button
                onClick={() => setPreviewDevice('tablet')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  previewDevice === 'tablet'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : isDarkMode
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Tablet className="w-3.5 h-3.5" />
                <span>{isKurdish ? 'ئایپاد' : 'iPad'}</span>
              </button>
              <button
                onClick={() => setPreviewDevice('large')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  previewDevice === 'large'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : isDarkMode
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>{isKurdish ? 'شاشەی گەورە' : 'Large'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mockup Container */}
        <div className="flex justify-center items-center py-2">
          <div
            className={`relative rounded-3xl overflow-hidden border shadow-2xl transition-all duration-300 ${
              previewDevice === 'mobile'
                ? 'w-full max-w-[340px] aspect-[16/10]'
                : previewDevice === 'tablet'
                ? 'w-full max-w-[560px] aspect-[16/9]'
                : 'w-full max-w-[760px] aspect-[21/9]'
            } ${
              isDarkMode ? 'border-slate-700 bg-slate-950' : 'border-slate-300 bg-slate-900'
            }`}
          >
            {/* Background Image */}
            {activePreviewImage ? (
              <img
                src={activePreviewImage}
                alt="Banner Preview"
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              // Default Fallback Mock Graphic
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#131b2e] to-slate-950 flex items-center justify-center">
                <div className="w-full h-full opacity-35 bg-[radial-gradient(#d4af37_1px,transparent_1px)] [background-size:16px_16px]" />
                <div className="absolute inset-0 flex items-center justify-end pr-8 sm:pr-14 opacity-25">
                  <div className="w-32 h-44 rounded-2xl border-4 border-amber-500/50 transform rotate-12 flex items-center justify-center">
                    <Smartphone className="w-12 h-12 text-amber-500/50" />
                  </div>
                </div>
              </div>
            )}

            {/* Gradient Overlays like native app */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-slate-950/20" />
            <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-3xl pointer-events-none" />

            {/* Banner Content Layout */}
            <div className="absolute inset-0 p-5 sm:p-6 flex flex-col justify-between z-10">
              {/* Top Row: Brand & Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black text-xs shadow-md shadow-amber-500/30">
                    F
                  </div>
                  <span className="font-bold text-white text-sm sm:text-base tracking-wide">
                    Froshiar
                  </span>
                </div>

                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-white/80 backdrop-blur-md border border-white/15">
                  {activePreviewImage
                    ? isKurdish
                      ? 'وێنەی کاستەم'
                      : 'Custom Banner'
                    : isKurdish
                    ? 'وێنەی بنەڕەتی ئەپ'
                    : 'Default Banner'}
                </span>
              </div>

              {/* Bottom Row: Animated Typewriter Text */}
              <div
                className={`space-y-1 ${
                  previewLanguage === 'ku' ? 'text-right' : 'text-left'
                }`}
                dir={previewLanguage === 'ku' ? 'rtl' : 'ltr'}
              >
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/70 backdrop-blur-md border border-white/10 shadow-lg">
                  <span className="text-xs sm:text-sm font-semibold text-amber-400">
                    {typewriterText}
                  </span>
                  <span className="inline-block w-1.5 h-3.5 bg-amber-400 animate-pulse rounded-sm" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── TWO COLUMNS: IMAGES & TYPEWRITER ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── COLUMN 1: DEVICE-SPECIFIC BANNER IMAGES ── */}
        <div
          className={`p-5 sm:p-6 rounded-2xl border transition-all space-y-5 ${
            isDarkMode
              ? 'bg-[#141C2E] border-slate-800 text-white'
              : 'bg-white border-slate-200 text-slate-900 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ImageIcon className="w-5 h-5 text-amber-500" />
              <h2 className="text-base sm:text-lg font-bold">
                {isKurdish ? 'وێنەی سابتی بانەر بەپێی ئامێر' : 'Device Banner Images'}
              </h2>
            </div>
            <span className="text-xs text-slate-400">
              {isKurdish ? 'سێ سایزی جیاواز' : '3 Form Factors'}
            </span>
          </div>

          {/* Device Tabs */}
          <div
            className={`grid grid-cols-3 gap-1.5 p-1 rounded-xl border ${
              isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-200'
            }`}
          >
            <button
              onClick={() => setActiveDeviceTab('mobile')}
              className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeDeviceTab === 'mobile'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : isDarkMode
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-4 h-4 shrink-0" />
              <span>{isKurdish ? 'مۆبایل' : 'Mobile'}</span>
            </button>

            <button
              onClick={() => setActiveDeviceTab('tablet')}
              className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeDeviceTab === 'tablet'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : isDarkMode
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Tablet className="w-4 h-4 shrink-0" />
              <span>{isKurdish ? 'ئایپاد / تابلێت' : 'iPad / Tablet'}</span>
            </button>

            <button
              onClick={() => setActiveDeviceTab('large')}
              className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeDeviceTab === 'large'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : isDarkMode
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Monitor className="w-4 h-4 shrink-0" />
              <span>{isKurdish ? 'شاشەی گەورە' : 'Large Screen'}</span>
            </button>
          </div>

          {/* Active Device Config Section */}
          <div className="space-y-4">
            {activeDeviceTab === 'mobile' && (
              <DeviceImageSection
                title={isKurdish ? 'بانەری مۆبایل (iPhone & Android)' : 'Mobile Phone Banner'}
                subtitle={isKurdish ? 'ڕێژەی پێشنیازکراو: نزیکەی 16:9 بۆ شاشەی مۆبایل' : 'Recommended ratio: ~16:9 or standard mobile banner'}
                value={mobileBannerUrl}
                onChange={setMobileBannerUrl}
                onUpload={(e) => handleFileUpload(e, 'mobile')}
                isDarkMode={isDarkMode}
                isKurdish={isKurdish}
              />
            )}

            {activeDeviceTab === 'tablet' && (
              <DeviceImageSection
                title={isKurdish ? 'بانەری ئایپاد و تابلێت (iPad Portrait & Tablets)' : 'iPad & Tablet Banner'}
                subtitle={isKurdish ? 'ڕێژەی پێشنیازکراو: 4:3 یان 16:10 بۆ ئایپاد' : 'Recommended ratio: 4:3 or 16:10 for iPad'}
                value={ipadBannerUrl}
                onChange={setIpadBannerUrl}
                onUpload={(e) => handleFileUpload(e, 'tablet')}
                isDarkMode={isDarkMode}
                isKurdish={isKurdish}
              />
            )}

            {activeDeviceTab === 'large' && (
              <DeviceImageSection
                title={isKurdish ? 'بانەری شاشەی گەورە (iPad Landscape & Large Screens)' : 'Large Screens & Landscape Banner'}
                subtitle={isKurdish ? 'ڕێژەی پێشنیازکراو: 16:9 یان 21:9 پان بۆ تابلێتی بەردەوام لەسەر دێسک' : 'Recommended ratio: 16:9 or 21:9 widescreen for POS registers'}
                value={largeBannerUrl}
                onChange={setLargeBannerUrl}
                onUpload={(e) => handleFileUpload(e, 'large')}
                isDarkMode={isDarkMode}
                isKurdish={isKurdish}
              />
            )}
          </div>

          {/* Helpful notice */}
          <div
            className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
              isDarkMode
                ? 'bg-amber-500/5 border-amber-500/20 text-amber-200/90'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>
                {isKurdish
                  ? 'تێبینی گرنگ: کاتێک لەم بەشە وێنە دیاری دەکەیت، وەک وێنەی سابتی سەرەکی بۆ هەموو ئامێرەکان دادەنرێت. لە هەمان کاتدا بەکارهێنەرانی ناو ئەپەکە دەتوانن وێنەی کاستەمی خۆیان دانێن بەپێی ئارەزووی خۆیان بێ ئەوەی کاریگەری لەسەر یەکتری دروست بکەن.'
                  : 'Note: Images configured here set the default permanent banner across devices. Users can still upload their personal business banners inside the app without conflict.'}
              </span>
            </div>
          </div>
        </div>

        {/* ── COLUMN 2: ANIMATED TYPEWRITER TEXT PHRASES ── */}
        <div
          className={`p-5 sm:p-6 rounded-2xl border transition-all space-y-5 ${
            isDarkMode
              ? 'bg-[#141C2E] border-slate-800 text-white'
              : 'bg-white border-slate-200 text-slate-900 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Type className="w-5 h-5 text-amber-500" />
              <h2 className="text-base sm:text-lg font-bold">
                {isKurdish ? 'دەستەواژەکانی تێکستی تایپینگ' : 'Typewriter Text Phrases'}
              </h2>
            </div>
            <span className="text-xs text-slate-400">
              {isKurdish ? 'کوردی و ئینگلیزی' : 'Kurdish & English'}
            </span>
          </div>

          {/* Duration slider */}
          <div
            className={`p-3.5 rounded-xl border ${
              isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-medium mb-1.5">
              <span>{isKurdish ? 'ماوەی مانەوەی دەستەواژە دوای تەواوبوون:' : 'Phrase Hold Duration:'}</span>
              <span className="font-bold text-amber-500">{holdDuration / 1000} {isKurdish ? 'چرکە' : 'seconds'}</span>
            </div>
            <input
              type="range"
              min="2000"
              max="10000"
              step="500"
              value={holdDuration}
              onChange={(e) => setHoldDuration(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Kurdish Phrases List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                <span>{isKurdish ? 'دەستەواژەکانی زمانی کوردی' : 'Kurdish Phrases'}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-500">
                  {kurdishPhrases.length}
                </span>
              </h3>
            </div>

            <div className="space-y-2">
              {kurdishPhrases.map((phrase, idx) => (
                <div
                  key={`ku_${idx}`}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                    isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  {editingKuIdx === idx ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editKuText}
                        onChange={(e) => setEditKuText(e.target.value)}
                        className={`flex-1 px-3 py-1.5 rounded-lg border text-xs sm:text-sm font-medium ${
                          isDarkMode
                            ? 'bg-slate-950 border-amber-500 text-white'
                            : 'bg-white border-amber-500 text-slate-900'
                        }`}
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          if (editKuText.trim()) {
                            const updated = [...kurdishPhrases];
                            updated[idx] = editKuText.trim();
                            setKurdishPhrases(updated);
                          }
                          setEditingKuIdx(null);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="w-5 h-5 rounded-md bg-amber-500/10 text-amber-500 text-[11px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-xs sm:text-sm font-medium truncate" dir="rtl">
                          {phrase}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleMovePhrase('ku', idx, 'up')}
                          disabled={idx === 0}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                          title="Move up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMovePhrase('ku', idx, 'down')}
                          disabled={idx === kurdishPhrases.length - 1}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                          title="Move down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingKuIdx(idx);
                            setEditKuText(phrase);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 cursor-pointer"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePhrase('ku', idx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Add new Kurdish phrase input */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder={isKurdish ? 'دەستەواژەی نوێی کوردی بنووسە...' : 'Enter new Kurdish phrase...'}
                value={newKuPhrase}
                onChange={(e) => setNewKuPhrase(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddKuPhrase()}
                dir="rtl"
                className={`flex-1 px-3.5 py-2 rounded-xl border text-xs sm:text-sm ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
              <button
                onClick={handleAddKuPhrase}
                disabled={!newKuPhrase.trim()}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{isKurdish ? 'زیادکردن' : 'Add'}</span>
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-800/40 my-3" />

          {/* English Phrases List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <span>{isKurdish ? 'دەستەواژەکانی زمانی ئینگلیزی' : 'English Phrases'}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-400">
                  {englishPhrases.length}
                </span>
              </h3>
            </div>

            <div className="space-y-2">
              {englishPhrases.map((phrase, idx) => (
                <div
                  key={`en_${idx}`}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                    isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  {editingEnIdx === idx ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editEnText}
                        onChange={(e) => setEditEnText(e.target.value)}
                        className={`flex-1 px-3 py-1.5 rounded-lg border text-xs sm:text-sm font-medium ${
                          isDarkMode
                            ? 'bg-slate-950 border-blue-500 text-white'
                            : 'bg-white border-blue-500 text-slate-900'
                        }`}
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          if (editEnText.trim()) {
                            const updated = [...englishPhrases];
                            updated[idx] = editEnText.trim();
                            setEnglishPhrases(updated);
                          }
                          setEditingEnIdx(null);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="w-5 h-5 rounded-md bg-blue-500/10 text-blue-400 text-[11px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-xs sm:text-sm font-medium truncate" dir="ltr">
                          {phrase}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleMovePhrase('en', idx, 'up')}
                          disabled={idx === 0}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                          title="Move up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMovePhrase('en', idx, 'down')}
                          disabled={idx === englishPhrases.length - 1}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                          title="Move down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingEnIdx(idx);
                            setEditEnText(phrase);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 cursor-pointer"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePhrase('en', idx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Add new English phrase input */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder={isKurdish ? 'دەستەواژەی نوێی ئینگلیزی بنووسە...' : 'Enter new English phrase...'}
                value={newEnPhrase}
                onChange={(e) => setNewEnPhrase(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddEnPhrase()}
                dir="ltr"
                className={`flex-1 px-3.5 py-2 rounded-xl border text-xs sm:text-sm ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
              <button
                onClick={handleAddEnPhrase}
                disabled={!newEnPhrase.trim()}
                className="px-3.5 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{isKurdish ? 'زیادکردن' : 'Add'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── HELPER COMPONENT FOR DEVICE IMAGE UPLOAD & URL INPUT ───────────────────
interface DeviceImageSectionProps {
  title: string;
  subtitle: string;
  value: string;
  onChange: (val: string) => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isDarkMode: boolean;
  isKurdish: boolean;
}

function DeviceImageSection({
  title,
  subtitle,
  value,
  onChange,
  onUpload,
  isDarkMode,
  isKurdish,
}: DeviceImageSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className={`p-4 rounded-xl border space-y-3.5 ${
        isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
      }`}
    >
      <div>
        <h3 className="text-sm font-bold">{title}</h3>
        <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
      </div>

      {/* Image Preview / Drop area */}
      <div className="relative group">
        {value ? (
          <div className="relative w-full h-44 rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
            <img src={value} alt="Banner" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-lg cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isKurdish ? 'گۆڕین' : 'Change'}</span>
              </button>
              <button
                onClick={() => onChange('')}
                className="px-3 py-1.5 rounded-lg bg-rose-500 text-white font-bold text-xs flex items-center gap-1 shadow-lg cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isKurdish ? 'سڕینەوە' : 'Remove'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`w-full h-36 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
              isDarkMode
                ? 'border-slate-700 hover:border-amber-500/60 bg-slate-950/40'
                : 'border-slate-300 hover:border-amber-500/60 bg-white'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold">
                {isKurdish ? 'کرتە بکە بۆ هەڵبژاردنی وێنە لە ئامێرەکەت' : 'Click to select image file from your device'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isKurdish ? 'یان لینکی وێنەکە لە خوارەوە دابنێ' : 'or paste direct image URL below'}
              </p>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onUpload}
          className="hidden"
        />
      </div>

      {/* Direct URL Input */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
          <LinkIcon className="w-3 h-3" />
          <span>{isKurdish ? 'یان بەستەری ڕاستەوخۆی وێنە (Image URL):' : 'Or direct Image URL:'}</span>
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="https://example.com/banner.jpg"
            value={value.startsWith('data:') ? (isKurdish ? '(وێنەی فایل لە ئامێرەوە بارکراوە)' : '(Uploaded from local file)') : value}
            onChange={(e) => onChange(e.target.value)}
            disabled={value.startsWith('data:')}
            className={`flex-1 px-3 py-2 rounded-xl border text-xs ${
              isDarkMode
                ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500'
                : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
            }`}
          />
          {value && (
            <button
              onClick={() => onChange('')}
              className="px-2.5 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 cursor-pointer"
            >
              {isKurdish ? 'پاککردنەوە' : 'Clear'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
