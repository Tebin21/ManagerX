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
  Video,
  Film,
  Users,
  User,
  Search,
  X,
  ChevronDown,
  UserCheck,
  ShieldAlert,
  Loader2,
  Maximize2,
  Scissors,
  Sliders,
  Info,
} from 'lucide-react';
import { getClientFirestore } from '@/lib/firebase';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  collection,
  getDocs,
} from 'firebase/firestore';

export interface RemoteBannerConfig {
  mobileBannerUrl: string;
  ipadBannerUrl: string;
  largeBannerUrl: string;
  mobileVideoUrl?: string;
  ipadVideoUrl?: string;
  largeVideoUrl?: string;
  kurdishPhrases: string[];
  englishPhrases: string[];
  typingSpeed?: number;
  deletingSpeed?: number;
  holdDuration?: number;
  updatedAt?: string;
  updatedBy?: string;
  targetUserEmail?: string | null;
}

export function sanitizeEmailForDocId(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
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

interface UserAccountItem {
  id: string;
  email: string;
  displayName?: string;
  businessName?: string;
  phone?: string;
  hasCustomBanner?: boolean;
}

export default function HeroBannerManagement({
  isDarkMode,
  language,
}: HeroBannerManagementProps) {
  const isKurdish = language === 'ku';

  // ─── Mode & User Selection State ──────────────────────────────────────────
  const [activeMode, setActiveMode] = useState<'global' | 'account'>('global');
  const [selectedUser, setSelectedUser] = useState<UserAccountItem | null>(null);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [isUserSearchOpen, setIsUserSearchOpen] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState<UserAccountItem[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [usersWithCustomBanner, setUsersWithCustomBanner] = useState<Set<string>>(new Set());

  // ─── Banner Config State ──────────────────────────────────────────────────
  // Images
  const [mobileBannerUrl, setMobileBannerUrl] = useState('');
  const [ipadBannerUrl, setIpadBannerUrl] = useState('');
  const [largeBannerUrl, setLargeBannerUrl] = useState('');

  // 20-Second Looping Background Videos (Auto-trimmed and compressed)
  const [mobileVideoUrl, setMobileVideoUrl] = useState('');
  const [ipadVideoUrl, setIpadVideoUrl] = useState('');
  const [largeVideoUrl, setLargeVideoUrl] = useState('');

  // Video processing & in-browser compression state
  const [videoProcessing, setVideoProcessing] = useState<{
    isProcessing: boolean;
    target: 'mobile' | 'tablet' | 'large' | null;
    progress: number;
    statusText: string;
  }>({
    isProcessing: false,
    target: null,
    progress: 0,
    statusText: '',
  });

  // Safe area crop guide overlay toggle
  const [showCropGuides, setShowCropGuides] = useState(false);

  // Typewriter Text
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
  const [activeMediaKind, setActiveMediaKind] = useState<'image' | 'video'>('image');
  const [activeDeviceTab, setActiveDeviceTab] = useState<'mobile' | 'tablet' | 'large'>('mobile');
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'tablet' | 'large'>('mobile');
  const [previewLanguage, setPreviewLanguage] = useState<'ku' | 'en'>('ku');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Live Typewriter Preview engine
  const [typewriterText, setTypewriterText] = useState('');
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // ─── 1. Load Registered Users and Check for Existing Overrides ────────────
  const fetchUsersAndOverrides = useCallback(async () => {
    const db = getClientFirestore();
    if (!db) return;
    setIsLoadingUsers(true);

    try {
      // 1. Fetch existing user overrides
      const overrideSet = new Set<string>();
      try {
        const overrideSnap = await getDocs(collection(db, 'user_banner_configs'));
        overrideSnap.forEach((d) => {
          overrideSet.add(d.id.toLowerCase());
          const data = d.data();
          if (data?.targetUserEmail) {
            overrideSet.add(sanitizeEmailForDocId(data.targetUserEmail));
          }
        });
      } catch (e) {
        console.warn('Could not query user_banner_configs:', e);
      }
      setUsersWithCustomBanner(overrideSet);

      // 2. Fetch users from app_telemetry_users & licenses
      const userMap = new Map<string, UserAccountItem>();

      try {
        const snap = await getDocs(collection(db, 'app_telemetry_users'));
        snap.forEach((d) => {
          const data = d.data();
          const email = (data.email || '').trim().toLowerCase();
          if (email && email.includes('@')) {
            const cleanKey = sanitizeEmailForDocId(email);
            userMap.set(email, {
              id: d.id,
              email,
              displayName: data.display_name || data.name || '',
              businessName: data.business_name || data.store_name || '',
              phone: data.phone || '',
              hasCustomBanner: overrideSet.has(cleanKey),
            });
          }
        });
      } catch (e) {
        console.warn('Could not query app_telemetry_users:', e);
      }

      try {
        const licSnap = await getDocs(collection(db, 'licenses'));
        licSnap.forEach((d) => {
          const data = d.data();
          const email = (data.userEmail || data.email || '').trim().toLowerCase();
          if (email && email.includes('@') && !userMap.has(email)) {
            const cleanKey = sanitizeEmailForDocId(email);
            userMap.set(email, {
              id: d.id,
              email,
              displayName: data.businessName || data.name || '',
              businessName: data.businessName || '',
              phone: data.phone || '',
              hasCustomBanner: overrideSet.has(cleanKey),
            });
          }
        });
      } catch (e) {
        console.warn('Could not query licenses:', e);
      }

      const list = Array.from(userMap.values());
      // Sort users: those with custom banner first, then alphabetically
      list.sort((a, b) => {
        if (a.hasCustomBanner && !b.hasCustomBanner) return -1;
        if (!a.hasCustomBanner && b.hasCustomBanner) return 1;
        return a.email.localeCompare(b.email);
      });

      setRegisteredUsers(list);
    } catch (err) {
      console.error('Error fetching users for banner management:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchUsersAndOverrides();
  }, [fetchUsersAndOverrides]);

  // ─── 2. Fetch & Subscribe to Firestore (Global or User-Specific) ──────────
  useEffect(() => {
    const db = getClientFirestore();
    if (!db) {
      setIsLoading(false);
      setErrorMessage(isKurdish ? 'هێڵی فایەربەیس بەردەست نییە' : 'Firebase not connected');
      return;
    }

    setIsLoading(true);
    let unsub: (() => void) | null = null;

    if (activeMode === 'account' && selectedUser) {
      // User-specific document
      const cleanEmail = sanitizeEmailForDocId(selectedUser.email);
      const docRef = doc(db, 'user_banner_configs', cleanEmail);

      unsub = onSnapshot(
        docRef,
        (snapshot) => {
          setIsLoading(false);
          if (snapshot.exists()) {
            const data = snapshot.data() as RemoteBannerConfig;
            setMobileBannerUrl(data.mobileBannerUrl || '');
            setIpadBannerUrl(data.ipadBannerUrl || '');
            setLargeBannerUrl(data.largeBannerUrl || '');
            setMobileVideoUrl(data.mobileVideoUrl || '');
            setIpadVideoUrl(data.ipadVideoUrl || '');
            setLargeVideoUrl(data.largeVideoUrl || '');
            if (Array.isArray(data.kurdishPhrases) && data.kurdishPhrases.length > 0) {
              setKurdishPhrases(data.kurdishPhrases);
            }
            if (Array.isArray(data.englishPhrases) && data.englishPhrases.length > 0) {
              setEnglishPhrases(data.englishPhrases);
            }
            if (data.holdDuration) setHoldDuration(data.holdDuration);
            if (data.typingSpeed) setTypingSpeed(data.typingSpeed);
            if (data.updatedAt) setLastUpdated(data.updatedAt);
          } else {
            // No custom doc yet for this user: keep current values or clear
            setLastUpdated(null);
          }
        },
        (err) => {
          console.error('Error fetching user banner config:', err);
          setIsLoading(false);
        }
      );
    } else {
      // Global banner document: app_config/dashboard_banner
      const docRef = doc(db, 'app_config', 'dashboard_banner');
      unsub = onSnapshot(
        docRef,
        (snapshot) => {
          setIsLoading(false);
          if (snapshot.exists()) {
            const data = snapshot.data() as RemoteBannerConfig;
            setMobileBannerUrl(data.mobileBannerUrl || '');
            setIpadBannerUrl(data.ipadBannerUrl || '');
            setLargeBannerUrl(data.largeBannerUrl || '');
            setMobileVideoUrl(data.mobileVideoUrl || '');
            setIpadVideoUrl(data.ipadVideoUrl || '');
            setLargeVideoUrl(data.largeVideoUrl || '');
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
          console.error('Error fetching global banner config:', err);
          setIsLoading(false);
        }
      );
    }

    return () => {
      if (unsub) unsub();
    };
  }, [activeMode, selectedUser, isKurdish]);

  // ─── 3. Filtered Users for Search ─────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    if (!userSearchTerm.trim()) return registeredUsers;
    const q = userSearchTerm.toLowerCase().trim();
    return registeredUsers.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.displayName && u.displayName.toLowerCase().includes(q)) ||
        (u.businessName && u.businessName.toLowerCase().includes(q)) ||
        (u.phone && u.phone.includes(q))
    );
  }, [registeredUsers, userSearchTerm]);

  // ─── 4. Typewriter Animation Engine for Preview ───────────────────────────
  const currentPreviewPhrases = useMemo(() => {
    if (previewLanguage === 'ku') {
      return kurdishPhrases.length > 0 ? kurdishPhrases : DEFAULT_KURDISH_PHRASES;
    }
    return englishPhrases.length > 0 ? englishPhrases : DEFAULT_ENGLISH_PHRASES;
  }, [previewLanguage, kurdishPhrases, englishPhrases]);

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

  useEffect(() => {
    setTypewriterText('');
    setIsDeleting(false);
    setPhraseIdx(0);
  }, [previewLanguage, kurdishPhrases, englishPhrases]);

  // ─── 5. Media Upload Handlers ─────────────────────────────────────────────
  // A. Image Upload with Instant Canvas Compression
  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'mobile' | 'tablet' | 'large'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (file.size > 15 * 1024 * 1024) {
      alert(
        isKurdish
          ? 'قەبارەی وێنەکە لە ١٥ مێگابایت زیاترە، تکایە وێنەیەکی بچووکتر دیاری بکە.'
          : 'File too large (> 15MB). Please choose a smaller image.'
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = target === 'large' ? 1400 : target === 'tablet' ? 1080 : 800;
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
        // Clean JPEG compression to ~80-150 KB
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.82);

        if (target === 'mobile') setMobileBannerUrl(compressedBase64);
        else if (target === 'tablet') setIpadBannerUrl(compressedBase64);
        else setLargeBannerUrl(compressedBase64);

        // Auto-sync preview
        setPreviewDevice(target);
        setActiveDeviceTab(target);
        setActiveMediaKind('image');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Helper: Fast Auto-Trim to 20.0s & High-Efficiency Compression
  const processAndUploadVideo = useCallback(
    async (
      file: File,
      target: 'mobile' | 'tablet' | 'large'
    ): Promise<string> => {
      return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const tempVideo = document.createElement('video');

        // Essential for mobile & Safari playback without user interaction blocks
        tempVideo.muted = true;
        tempVideo.volume = 0;
        tempVideo.playsInline = true;
        tempVideo.setAttribute('playsinline', '');
        tempVideo.setAttribute('webkit-playsinline', '');
        tempVideo.preload = 'auto';
        tempVideo.crossOrigin = 'anonymous';

        // Invisible DOM attachment to ensure browser decodes frames without stalling
        tempVideo.style.position = 'fixed';
        tempVideo.style.top = '-9999px';
        tempVideo.style.left = '-9999px';
        tempVideo.style.width = '1px';
        tempVideo.style.height = '1px';
        tempVideo.style.opacity = '0';
        tempVideo.style.pointerEvents = 'none';
        document.body.appendChild(tempVideo);

        let cleanupDone = false;
        const cleanup = () => {
          if (cleanupDone) return;
          cleanupDone = true;
          try {
            tempVideo.pause();
            tempVideo.src = '';
            tempVideo.load();
            if (tempVideo.parentNode) {
              tempVideo.parentNode.removeChild(tempVideo);
            }
          } catch {}
          try {
            URL.revokeObjectURL(objectUrl);
          } catch {}
        };

        // If file is already short (<= 20.5s) and compact (<= 750KB), read directly!
        const checkDirectRead = (duration: number) => {
          if (file.size <= 750 * 1024 && duration <= 20.5) {
            setVideoProcessing({
              isProcessing: true,
              target,
              progress: 50,
              statusText: isKurdish ? 'خوێندنەوەی ڤیدیۆ...' : 'Loading video file...',
            });
            const reader = new FileReader();
            reader.onload = (ev) => {
              cleanup();
              setVideoProcessing({ isProcessing: false, target: null, progress: 100, statusText: '' });
              resolve(ev.target?.result as string);
            };
            reader.onerror = (err) => {
              cleanup();
              setVideoProcessing({ isProcessing: false, target: null, progress: 0, statusText: '' });
              reject(err);
            };
            reader.readAsDataURL(file);
            return true;
          }
          return false;
        };

        tempVideo.onloadedmetadata = async () => {
          try {
            const rawDuration = tempVideo.duration || 0;
            const targetDuration = Math.min(rawDuration || 20, 20.0);
            const wasTrimmed = rawDuration > 20.2;

            // Check if fast direct read is possible
            if (checkDirectRead(rawDuration)) return;

            setVideoProcessing({
              isProcessing: true,
              target,
              progress: 10,
              statusText: isKurdish
                ? wasTrimmed
                  ? `بڕینی یەکەم ٢٠ چرکە لە کۆی (${Math.round(rawDuration)} چرکە) و کۆمپریس کردن...`
                  : 'دەستپێکردنی کۆمپریس کردنی ڤیدیۆ...'
                : wasTrimmed
                ? `Trimming first 20s from ${Math.round(rawDuration)}s and compressing...`
                : 'Compressing video (max 20s)...',
            });

            // Target dimensions for bandwidth-optimized background video
            const maxDim = target === 'large' ? 640 : target === 'tablet' ? 540 : 440;
            let w = tempVideo.videoWidth || 480;
            let h = tempVideo.videoHeight || 270;

            if (w > maxDim || h > maxDim) {
              if (w > h) {
                h = Math.round((h * maxDim) / w);
                w = maxDim;
              } else {
                w = Math.round((w * maxDim) / h);
                h = maxDim;
              }
            }
            w = Math.floor(w / 2) * 2;
            h = Math.floor(h / 2) * 2;

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d', { alpha: false });

            // If browser cannot transcode via canvas or MediaRecorder
            if (!ctx || typeof (canvas as any).captureStream !== 'function' || typeof MediaRecorder === 'undefined') {
              const reader = new FileReader();
              reader.onload = () => {
                cleanup();
                setVideoProcessing({ isProcessing: false, target: null, progress: 100, statusText: '' });
                resolve(reader.result as string);
              };
              reader.onerror = (e) => {
                cleanup();
                setVideoProcessing({ isProcessing: false, target: null, progress: 0, statusText: '' });
                reject(e);
              };
              reader.readAsDataURL(file);
              return;
            }

            // Determine best supported MIME type (Prioritize MP4 for Apple iOS AVPlayer compatibility)
            let mimeType = '';
            if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
              mimeType = 'video/mp4;codecs=avc1';
            } else if (MediaRecorder.isTypeSupported('video/mp4;codecs=h264')) {
              mimeType = 'video/mp4;codecs=h264';
            } else if (MediaRecorder.isTypeSupported('video/mp4')) {
              mimeType = 'video/mp4';
            } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
              mimeType = 'video/webm;codecs=vp9';
            } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
              mimeType = 'video/webm;codecs=vp8';
            } else if (MediaRecorder.isTypeSupported('video/webm')) {
              mimeType = 'video/webm';
            }

            const stream = (canvas as any).captureStream(24);
            const recorderOptions: MediaRecorderOptions = {
              videoBitsPerSecond: 250_000, // 250 kbps ensures 20s is ~600 KB (safely within 1MB Firestore limit)
            };
            if (mimeType) recorderOptions.mimeType = mimeType;

            const recorder = new MediaRecorder(stream, recorderOptions);
            const chunks: Blob[] = [];

            recorder.ondataavailable = (ev) => {
              if (ev.data && ev.data.size > 0) chunks.push(ev.data);
            };

            let isStopped = false;
            const stopRecording = () => {
              if (isStopped) return;
              isStopped = true;
              if (recorder.state === 'recording') {
                recorder.stop();
              }
            };

            recorder.onstop = () => {
              try {
                setVideoProcessing((prev) => ({
                  ...prev,
                  progress: 95,
                  statusText: isKurdish
                    ? 'کۆتاییهاتن بە ئامادەکردنی ڤیدیۆ...'
                    : 'Finalizing compressed video...',
                }));

                const finalBlob = new Blob(chunks, { type: mimeType || 'video/webm' });
                const reader = new FileReader();
                reader.onload = () => {
                  cleanup();
                  setVideoProcessing({
                    isProcessing: false,
                    target: null,
                    progress: 100,
                    statusText: isKurdish ? 'ڤیدیۆکە ئامادەیە (٢٠ چرکە)' : 'Video ready (20s)!',
                  });
                  resolve(reader.result as string);
                };
                reader.onerror = (err) => {
                  cleanup();
                  setVideoProcessing({ isProcessing: false, target: null, progress: 0, statusText: '' });
                  reject(err);
                };
                reader.readAsDataURL(finalBlob);
              } catch (err) {
                cleanup();
                setVideoProcessing({ isProcessing: false, target: null, progress: 0, statusText: '' });
                reject(err);
              }
            };

            // 2x speed for faster transcoding (completes 20s in ~8-10 seconds)
            try {
              tempVideo.playbackRate = 2.0;
            } catch {}

            recorder.start(250);

            // Attempt playback safely
            try {
              tempVideo.currentTime = 0;
              await tempVideo.play();
            } catch (playErr) {
              tempVideo.muted = true;
              await tempVideo.play().catch(() => {});
            }

            // Frame pump timer at 24fps
            const fpsInterval = 1000 / 24;
            const pumpTimer = setInterval(() => {
              if (isStopped) {
                clearInterval(pumpTimer);
                return;
              }

              // Ensure video is playing
              if (tempVideo.paused && !tempVideo.ended && tempVideo.currentTime < targetDuration) {
                tempVideo.play().catch(() => {});
              }

              // Draw frame to canvas
              try {
                ctx.drawImage(tempVideo, 0, 0, w, h);
              } catch {}

              const cur = tempVideo.currentTime;
              const pct = Math.min(92, Math.max(12, Math.round((cur / targetDuration) * 92)));
              setVideoProcessing((prev) => ({
                ...prev,
                progress: pct,
                statusText: isKurdish
                  ? `بڕین و کۆمپریس کردن: ${Math.round(cur)} / ${Math.round(targetDuration)} چرکە (%${pct})`
                  : `Trimming & compressing: ${Math.round(cur)}s / ${Math.round(targetDuration)}s (${pct}%)`,
              }));

              if (cur >= targetDuration || tempVideo.ended) {
                clearInterval(pumpTimer);
                stopRecording();
              }
            }, fpsInterval);

            // Absolute safety timeout: after 14 seconds max, stop recording and complete!
            setTimeout(() => {
              if (!isStopped) {
                clearInterval(pumpTimer);
                stopRecording();
              }
            }, 14000);
          } catch (err) {
            cleanup();
            setVideoProcessing({ isProcessing: false, target: null, progress: 0, statusText: '' });
            reject(err);
          }
        };

        tempVideo.onerror = () => {
          cleanup();
          setVideoProcessing({ isProcessing: false, target: null, progress: 0, statusText: '' });
          reject(new Error(isKurdish ? 'هەڵە ڕوویدا لە خوێندنەوەی فایلی ڤیدیۆ' : 'Failed to read video file'));
        };

        tempVideo.src = objectUrl;
      });
    },
    [isKurdish]
  );

  // B. Video Upload with Automatic 20-Second Trimming, Compression & Cloud Upload
  const handleVideoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'mobile' | 'tablet' | 'large'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    try {
      setErrorMessage(null);
      const uploadedUrl = await processAndUploadVideo(file, target);
      if (target === 'mobile') setMobileVideoUrl(uploadedUrl);
      else if (target === 'tablet') setIpadVideoUrl(uploadedUrl);
      else setLargeVideoUrl(uploadedUrl);

      // Auto-sync preview
      setPreviewDevice(target);
      setActiveDeviceTab(target);
      setActiveMediaKind('video');
    } catch (err: any) {
      console.error('Video upload failed:', err);
      alert(
        err?.message ||
          (isKurdish
            ? 'هەڵەیەک ڕوویدا لە کاتی ئامادەکردن یان بارکردنی ڤیدیۆکە'
            : 'An error occurred while processing or uploading the video')
      );
    }
  };

  // ─── 6. Save to Firestore (Global OR Selected Account) ────────────────────
  const handleSaveToCloud = async () => {
    const db = getClientFirestore();
    if (!db) {
      setErrorMessage(isKurdish ? 'پەیوەندی بە فایەربەیس نییە' : 'Cannot reach Firebase');
      return;
    }

    if (activeMode === 'account' && !selectedUser) {
      alert(isKurdish ? 'تکایە سەرەتا ئەکاونتێک دیاری بکە' : 'Please select an account first');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const payload: RemoteBannerConfig = {
        mobileBannerUrl: mobileBannerUrl.trim(),
        ipadBannerUrl: ipadBannerUrl.trim(),
        largeBannerUrl: largeBannerUrl.trim(),
        mobileVideoUrl: mobileVideoUrl.trim(),
        ipadVideoUrl: ipadVideoUrl.trim(),
        largeVideoUrl: largeVideoUrl.trim(),
        kurdishPhrases: kurdishPhrases.filter((p) => p.trim().length > 0),
        englishPhrases: englishPhrases.filter((p) => p.trim().length > 0),
        typingSpeed,
        holdDuration,
        updatedAt: new Date().toISOString(),
        updatedBy: 'Admin Panel',
        targetUserEmail: activeMode === 'account' ? selectedUser?.email || null : null,
      };

      if (activeMode === 'account' && selectedUser) {
        const cleanEmail = sanitizeEmailForDocId(selectedUser.email);
        // Save to user_banner_configs AND app_config/banner_user_{cleanEmail} for 100% reliability
        await setDoc(doc(db, 'user_banner_configs', cleanEmail), payload, { merge: true });
        await setDoc(doc(db, 'app_config', `banner_user_${cleanEmail}`), payload, { merge: true });

        // Update local status
        setUsersWithCustomBanner((prev) => new Set(prev).add(cleanEmail));
      } else {
        // Global Banner
        await setDoc(doc(db, 'app_config', 'dashboard_banner'), payload, { merge: true });
      }

      setSaveSuccess(true);
      setLastUpdated(payload.updatedAt || null);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error('Failed to save banner config:', err);
      setErrorMessage(
        err.message || (isKurdish ? 'هەڵەیەک ڕوویدا لە کاتی پاشەکەوتکردن' : 'Failed to save configuration')
      );
    } finally {
      setIsSaving(false);
    }
  };

  // ─── 7. Delete / Reset User-Specific Override ─────────────────────────────
  const handleDeleteUserOverride = async () => {
    if (!selectedUser) return;
    const confirmMsg = isKurdish
      ? `ئایا دڵنیایت لە سڕینەوەی ڕێکخستنی تایبەت بە ئەکاونتی (${selectedUser.email})؟ بەکارهێنەرەکە ڕاستەوخۆ دەگەڕێتەوە سەر بانەری گشتی سەرەکی.`
      : `Are you sure you want to remove the custom banner for (${selectedUser.email})? The user will immediately revert to the global default banner.`;

    if (!confirm(confirmMsg)) return;

    const db = getClientFirestore();
    if (!db) return;

    setIsSaving(true);
    try {
      const cleanEmail = sanitizeEmailForDocId(selectedUser.email);
      await deleteDoc(doc(db, 'user_banner_configs', cleanEmail));
      await deleteDoc(doc(db, 'app_config', `banner_user_${cleanEmail}`));

      setUsersWithCustomBanner((prev) => {
        const next = new Set(prev);
        next.delete(cleanEmail);
        return next;
      });

      alert(
        isKurdish
          ? 'بانەری تایبەتی سڕایەوە و بەکارهێنەرەکە گەڕایەوە سەر بانەری سەرەکی.'
          : 'User custom banner removed. User will now see the global default banner.'
      );

      // Return to global mode
      setActiveMode('global');
      setSelectedUser(null);
    } catch (err: any) {
      alert(err.message || 'Failed to remove custom banner');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── 8. Reset to Defaults (Global) ────────────────────────────────────────
  const handleResetDefaults = () => {
    if (
      confirm(
        isKurdish
          ? 'ئایا دڵنیایت لە گەڕاندنەوەی سەرجەم ڕێکخستنەکان بۆ دۆخی سەرەتایی؟'
          : 'Are you sure you want to reset everything to default values?'
      )
    ) {
      setMobileBannerUrl('');
      setIpadBannerUrl('');
      setLargeBannerUrl('');
      setMobileVideoUrl('');
      setIpadVideoUrl('');
      setLargeVideoUrl('');
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

  // ─── Active Preview Image / Video Resolution ──────────────────────────────
  const activePreviewVideo = useMemo(() => {
    if (previewDevice === 'large' && largeVideoUrl) return largeVideoUrl;
    if (previewDevice === 'tablet' && (ipadVideoUrl || largeVideoUrl)) return ipadVideoUrl || largeVideoUrl;
    if (mobileVideoUrl) return mobileVideoUrl;
    return null;
  }, [previewDevice, largeVideoUrl, ipadVideoUrl, mobileVideoUrl]);

  const activePreviewImage = useMemo(() => {
    if (previewDevice === 'large' && largeBannerUrl) return largeBannerUrl;
    if (previewDevice === 'tablet' && (ipadBannerUrl || largeBannerUrl)) return ipadBannerUrl || largeBannerUrl;
    if (mobileBannerUrl) return mobileBannerUrl;
    return null;
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
                  ? 'گۆڕینی وێنەی سابتی بانەر، دانانی ڤیدیۆی ٢٠ چرکەیی بەپێی قەبارەی ئامێر (مۆبایل، ئایپاد، شاشەی گەورە) بە بڕین و کۆمپرسی خۆکار، پێشبینینی ڕاستەوخۆی کەت بوون و دەرکەوتن'
                  : 'Manage responsive banner images, 20-second auto-trimmed and compressed background videos for Mobile, iPad, and Large Screens with live crop preview.'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
            {activeMode === 'account' && selectedUser && (
              <button
                onClick={handleDeleteUserOverride}
                disabled={isSaving}
                className="px-3.5 py-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                title={isKurdish ? 'سڕینەوەی بانەری تایبەت' : 'Remove Custom Banner'}
              >
                <Trash2 className="w-4 h-4" />
                <span>{isKurdish ? 'سڕینەوەی بانەری تایبەت' : 'Remove Override'}</span>
              </button>
            )}

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
                  : activeMode === 'account'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20'
              }`}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>{isKurdish ? 'پاشەکەوت دەکرێت...' : 'Saving...'}</span>
                </>
              ) : saveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {activeMode === 'account'
                      ? isKurdish
                        ? 'بۆ ئەم ئەکاونتە بڵاوکرایەوە!'
                        : 'Synced for Account!'
                      : isKurdish
                      ? 'بۆ هەموو ئامێرەکان بڵاوکرایەوە!'
                      : 'Synced to All Devices!'}
                  </span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>
                    {activeMode === 'account'
                      ? isKurdish
                        ? `پاشەکەوتکردن بۆ ئەکاونت (${selectedUser?.displayName || selectedUser?.email || ''})`
                        : `Save for (${selectedUser?.email || 'Account'})`
                      : isKurdish
                      ? 'پاشەکەوتکردن بۆ هەموو ئەپ'
                      : 'Save to Cloud (Global)'}
                  </span>
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

      {/* ─── TARGET SCOPE SELECTOR: GLOBAL VS ACCOUNT SPECIFIC ─────────────── */}
      <div
        className={`p-4 sm:p-5 rounded-2xl border transition-all ${
          isDarkMode ? 'bg-[#141C2E] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-amber-500" />
            <div>
              <h2 className="text-sm sm:text-base font-bold">
                {isKurdish ? 'دیاریکردنی ئامانجی بانەر (Target Scope)' : 'Banner Target Audience'}
              </h2>
              <p className="text-xs text-slate-400">
                {isKurdish
                  ? 'دەتوانیت بانەری گشتی بۆ هەموو بەکارهێنەران دابنێیت، یان بەتایبەتی بەپێی ئیمەیڵ ئەکاونتێک دیاری بکەیت.'
                  : 'Customize the default banner for all users, or target a specific user account by email.'}
              </p>
            </div>
          </div>

          {/* Mode Switcher Buttons */}
          <div
            className={`p-1 rounded-xl border flex items-center text-xs font-bold ${
              isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-200'
            }`}
          >
            <button
              onClick={() => {
                setActiveMode('global');
                setSelectedUser(null);
                setIsUserSearchOpen(false);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeMode === 'global'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : isDarkMode
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isKurdish ? 'بانەری گشتی (هەموو بەکارهێنەران)' : 'Global Default (All Users)'}</span>
            </button>

            <button
              onClick={() => {
                setActiveMode('account');
                setIsUserSearchOpen(true);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeMode === 'account'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : isDarkMode
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>{isKurdish ? 'بانەری تایبەت بە ئەکاونت' : 'Account-Specific Override'}</span>
            </button>
          </div>
        </div>

        {/* Account Search & Selection Dropdown / Drawer */}
        {activeMode === 'account' && (
          <div className="mt-4 pt-4 border-t border-slate-800/40 space-y-3">
            {/* Active Selected User Card (if chosen) */}
            {selectedUser ? (
              <div
                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isDarkMode
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-200'
                    : 'bg-blue-50 border-blue-200 text-blue-950'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500 text-white font-bold flex items-center justify-center shadow-md">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm sm:text-base">
                        {selectedUser.displayName || selectedUser.businessName || selectedUser.email}
                      </span>
                      {selectedUser.hasCustomBanner && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {isKurdish ? 'بانەری تایبەتی هەیە' : 'Has Custom Banner'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs opacity-80 mt-0.5">
                      <span>{selectedUser.email}</span>
                      {selectedUser.phone && <span>• {selectedUser.phone}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsUserSearchOpen((prev) => !prev)}
                    className="px-3 py-1.5 rounded-lg border border-blue-500/30 bg-blue-500/20 hover:bg-blue-500/30 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>{isKurdish ? 'گۆڕینی ئەکاونت' : 'Change Account'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedUser(null);
                      setIsUserSearchOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                    title={isKurdish ? 'لابردن' : 'Clear'}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
                  isDarkMode
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
                <span>
                  {isKurdish
                    ? 'تکایە لە خوارەوە ئەکاونتی ئەو کەسە دیاری بکە کە دەتەوێت بانەری بۆ بگۆڕیت (بەپێی ئیمەیڵ، ناو، یان مۆبایل).'
                    : 'Please search and select the target user account below to customize their banner.'}
                </span>
              </div>
            )}

            {/* Live Search Input & Dropdown List */}
            {isUserSearchOpen && (
              <div
                className={`p-3.5 rounded-xl border space-y-3 ${
                  isDarkMode ? 'bg-slate-900/90 border-slate-700' : 'bg-slate-50 border-slate-300'
                }`}
              >
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder={
                      isKurdish
                        ? 'گەڕان بەپێی ئیمەیڵ، ناوی بازرگانی، یان ژمارە مۆبایل...'
                        : 'Search by email, store name, or phone...'
                    }
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    autoFocus
                    className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs sm:text-sm font-medium ${
                      isDarkMode
                        ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                  {userSearchTerm && (
                    <button
                      onClick={() => setUserSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* User Results List */}
                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                  {isLoadingUsers ? (
                    <div className="py-4 text-center text-xs text-slate-400">
                      {isKurdish ? 'بەستەرەوە لەگەڵ لیستی بەکارهێنەران...' : 'Loading accounts...'}
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-400">
                      {isKurdish ? 'هیچ ئەکاونتێک نەدۆزرایەوە' : 'No matching accounts found'}
                    </div>
                  ) : (
                    filteredUsers.slice(0, 15).map((user) => (
                      <div
                        key={user.email}
                        onClick={() => {
                          setSelectedUser(user);
                          setIsUserSearchOpen(false);
                          setUserSearchTerm('');
                        }}
                        className={`p-2.5 rounded-lg border transition-all flex items-center justify-between cursor-pointer ${
                          selectedUser?.email === user.email
                            ? 'bg-blue-600/20 border-blue-500'
                            : isDarkMode
                            ? 'bg-slate-950/60 border-slate-800 hover:border-slate-600 hover:bg-slate-950'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-amber-400 font-bold text-xs shrink-0">
                            {user.email.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs truncate">
                                {user.displayName || user.businessName || user.email}
                              </span>
                              {user.hasCustomBanner && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  {isKurdish ? 'بانەری هەیە' : 'Custom Active'}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 truncate block">
                              {user.email} {user.phone ? `(${user.phone})` : ''}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="px-2.5 py-1 rounded-md bg-blue-600 text-white font-bold text-[11px] shrink-0"
                        >
                          {isKurdish ? 'دیاریکردن' : 'Select'}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── LIVE INTERACTIVE PREVIEW CARD ─────────────────────────────────── */}
      <div
        className={`p-5 sm:p-6 rounded-2xl border transition-all ${
          isDarkMode ? 'bg-[#141C2E] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-amber-500" />
            <h2 className="text-base sm:text-lg font-bold">
              {isKurdish ? 'پێشبینینی ڕاستەوخۆ لە ناو ئەپ (Live Mockup)' : 'Live App Mockup Preview'}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Media type toggle for preview (Image vs Video) */}
            <div
              className={`p-1 rounded-xl border flex items-center text-xs font-semibold ${
                isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <button
                onClick={() => setActiveMediaKind('image')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  activeMediaKind === 'image'
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                    : isDarkMode
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>{isKurdish ? 'وێنە' : 'Image'}</span>
              </button>
              <button
                onClick={() => setActiveMediaKind('video')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  activeMediaKind === 'video'
                    ? 'bg-purple-600 text-white shadow-sm font-bold'
                    : isDarkMode
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>{isKurdish ? 'ڤیدیۆ (٢٠ چرکە)' : '20s Video'}</span>
              </button>
            </div>

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

            {/* Device selector for preview (automatically syncs device tabs below) */}
            <div
              className={`p-1 rounded-xl border flex items-center text-xs font-semibold ${
                isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <button
                onClick={() => {
                  setPreviewDevice('mobile');
                  setActiveDeviceTab('mobile');
                }}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  previewDevice === 'mobile'
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                    : isDarkMode
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>{isKurdish ? 'مۆبایل' : 'Phone'}</span>
              </button>
              <button
                onClick={() => {
                  setPreviewDevice('tablet');
                  setActiveDeviceTab('tablet');
                }}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  previewDevice === 'tablet'
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                    : isDarkMode
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Tablet className="w-3.5 h-3.5" />
                <span>{isKurdish ? 'ئایپاد' : 'iPad'}</span>
              </button>
              <button
                onClick={() => {
                  setPreviewDevice('large');
                  setActiveDeviceTab('large');
                }}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  previewDevice === 'large'
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                    : isDarkMode
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>{isKurdish ? 'شاشەی گەورە' : 'Large'}</span>
              </button>
            </div>

            {/* Crop Guides Toggle */}
            <button
              onClick={() => setShowCropGuides(!showCropGuides)}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                showCropGuides
                  ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-sm'
                  : isDarkMode
                  ? 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
              title={isKurdish ? 'پشکنینی چوارچێوەی دەق و کەت بوون' : 'Toggle Safe Area & Crop Guides'}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{isKurdish ? 'هێڵی کەت بوون' : 'Crop Guides'}</span>
            </button>
          </div>
        </div>

        {/* Mockup Container */}
        <div className="flex justify-center items-center py-2">
          <div
            className={`relative rounded-3xl overflow-hidden border shadow-2xl transition-all duration-300 ${
              previewDevice === 'mobile'
                ? 'w-full max-w-[340px] aspect-[16/10]'
                : previewDevice === 'tablet'
                ? 'w-full max-w-[560px] aspect-[16/10]'
                : 'w-full max-w-[760px] aspect-[21/9]'
            } ${
              isDarkMode ? 'border-slate-700 bg-slate-950' : 'border-slate-300 bg-slate-900'
            }`}
          >
            {/* Background Media: 20s Looping Video OR Image */}
            {activeMediaKind === 'video' && activePreviewVideo ? (
              <video
                key={`video_${previewDevice}_${activePreviewVideo}`}
                src={activePreviewVideo}
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : activeMediaKind === 'image' && activePreviewImage ? (
              <img
                src={activePreviewImage}
                alt="Banner Preview"
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : activePreviewVideo ? (
              <video
                key={`video_fallback_${previewDevice}_${activePreviewVideo}`}
                src={activePreviewVideo}
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : activePreviewImage ? (
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

            {/* Safe Area & Crop Guides Overlay (Optional visualizer) */}
            {showCropGuides && (
              <div className="absolute inset-0 z-30 pointer-events-none p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between border-2 border-dashed border-amber-400/70 bg-amber-500/10 rounded-xl px-2.5 py-1.5 backdrop-blur-[2px]">
                  <span className="text-[10px] font-bold text-amber-300">
                    {isKurdish ? '★ ناوچەی پارێزراوی سەرەوە (لۆگۆ و ناوی بازرگانی)' : '★ Top Safe Zone (Brand & Logo)'}
                  </span>
                  <span className="text-[9px] font-mono text-amber-400/90">
                    {previewDevice === 'mobile' ? '16:10' : previewDevice === 'tablet' ? '16:10' : '21:9'}
                  </span>
                </div>
                <div className="flex items-center justify-between border-2 border-dashed border-amber-400/70 bg-amber-500/10 rounded-xl px-2.5 py-1.5 backdrop-blur-[2px]">
                  <span className="text-[10px] font-bold text-amber-300">
                    {isKurdish ? '★ ناوچەی پارێزراوی خوارەوە (دەقی تایپینگ)' : '★ Bottom Safe Zone (Typewriter)'}
                  </span>
                  <span className="text-[9px] font-mono text-amber-400/90">
                    {isKurdish ? 'ناپۆشرێت' : 'Protected'}
                  </span>
                </div>
              </div>
            )}

            {/* Gradient Overlays like native app */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-slate-950/20" />
            <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-3xl pointer-events-none" />

            {/* Banner Content Layout */}
            <div className="absolute inset-0 p-5 sm:p-6 flex flex-col justify-between z-10">
              {/* Top Row: Brand & Status Badges */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black text-xs shadow-md shadow-amber-500/30">
                    F
                  </div>
                  <span className="font-bold text-white text-sm sm:text-base tracking-wide">
                    {selectedUser ? selectedUser.businessName || 'Froshiar' : 'Froshiar'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Media Kind Badge */}
                  {activeMediaKind === 'video' && activePreviewVideo ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                      <Film className="w-3 h-3" />
                      <span>{isKurdish ? 'ڤیدیۆ (٢٠ چرکە)' : '20s Video'}</span>
                    </span>
                  ) : activePreviewImage ? (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-white/80 backdrop-blur-md border border-white/15">
                      {isKurdish ? 'وێنەی کاستەم' : 'Custom Image'}
                    </span>
                  ) : activePreviewVideo ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                      <Film className="w-3 h-3" />
                      <span>{isKurdish ? 'ڤیدیۆ (٢٠ چرکە)' : '20s Video'}</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-white/80 backdrop-blur-md border border-white/15">
                      {isKurdish ? 'بنەڕەتی ئەپ' : 'App Default'}
                    </span>
                  )}

                  {/* Account Badge */}
                  {selectedUser && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-500/40">
                      {selectedUser.email}
                    </span>
                  )}
                </div>
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

      {/* ─── TWO COLUMNS: MEDIA & TYPEWRITER ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── COLUMN 1: DEVICE-SPECIFIC MEDIA (IMAGES & 10s VIDEOS) ── */}
        <div
          className={`p-5 sm:p-6 rounded-2xl border transition-all space-y-5 ${
            isDarkMode
              ? 'bg-[#141C2E] border-slate-800 text-white'
              : 'bg-white border-slate-200 text-slate-900 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Layers className="w-5 h-5 text-amber-500" />
              <h2 className="text-base sm:text-lg font-bold">
                {isKurdish ? 'وێنە و ڤیدیۆی بانەر بەپێی ئامێر' : 'Device Banner Media (Image & Video)'}
              </h2>
            </div>

            {/* Media Type Switcher: Image vs Video */}
            <div
              className={`p-1 rounded-xl border flex items-center text-xs font-bold ${
                isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <button
                onClick={() => setActiveMediaKind('image')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  activeMediaKind === 'image'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : isDarkMode
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>{isKurdish ? 'وێنە' : 'Images'}</span>
              </button>

              <button
                onClick={() => setActiveMediaKind('video')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  activeMediaKind === 'video'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : isDarkMode
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>{isKurdish ? 'ڤیدیۆ (٢٠ چرکە)' : '20s Videos'}</span>
              </button>
            </div>
          </div>

          {/* Device Tabs (Mobile, iPad, Large) */}
          <div
            className={`grid grid-cols-3 gap-1.5 p-1 rounded-xl border ${
              isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-200'
            }`}
          >
            <button
              onClick={() => {
                setActiveDeviceTab('mobile');
                setPreviewDevice('mobile');
              }}
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
              onClick={() => {
                setActiveDeviceTab('tablet');
                setPreviewDevice('tablet');
              }}
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
              onClick={() => {
                setActiveDeviceTab('large');
                setPreviewDevice('large');
              }}
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
            {activeMediaKind === 'image' ? (
              <>
                {activeDeviceTab === 'mobile' && (
                  <DeviceImageSection
                    device="mobile"
                    title={isKurdish ? 'وێنەی بانەری مۆبایل (iPhone & Android)' : 'Mobile Phone Banner Image'}
                    subtitle={isKurdish ? 'ڕێژەی پێشنیازکراو: 16:10 بۆ شاشەی مۆبایل' : 'Recommended ratio: ~16:10 for mobile'}
                    value={mobileBannerUrl}
                    onChange={setMobileBannerUrl}
                    onUpload={(e) => handleImageUpload(e, 'mobile')}
                    isDarkMode={isDarkMode}
                    isKurdish={isKurdish}
                    typewriterText={typewriterText}
                    businessName={selectedUser ? selectedUser.businessName || 'Froshiar' : 'Froshiar'}
                    showCropGuides={showCropGuides}
                    onToggleCropGuides={() => setShowCropGuides(!showCropGuides)}
                  />
                )}

                {activeDeviceTab === 'tablet' && (
                  <DeviceImageSection
                    device="tablet"
                    title={isKurdish ? 'وێنەی بانەری ئایپاد و تابلێت (iPad Portrait)' : 'iPad & Tablet Banner Image'}
                    subtitle={isKurdish ? 'ڕێژەی پێشنیازکراو: 4:3 یان 16:10 بۆ ئایپاد' : 'Recommended ratio: 4:3 or 16:10 for iPad'}
                    value={ipadBannerUrl}
                    onChange={setIpadBannerUrl}
                    onUpload={(e) => handleImageUpload(e, 'tablet')}
                    isDarkMode={isDarkMode}
                    isKurdish={isKurdish}
                    typewriterText={typewriterText}
                    businessName={selectedUser ? selectedUser.businessName || 'Froshiar' : 'Froshiar'}
                    showCropGuides={showCropGuides}
                    onToggleCropGuides={() => setShowCropGuides(!showCropGuides)}
                  />
                )}

                {activeDeviceTab === 'large' && (
                  <DeviceImageSection
                    device="large"
                    title={isKurdish ? 'وێنەی بانەری شاشەی گەورە (iPad Landscape & Large)' : 'Large Screens Banner Image'}
                    subtitle={isKurdish ? 'ڕێژەی پێشنیازکراو: 16:9 یان 21:9 پان' : 'Recommended ratio: 16:9 or 21:9 widescreen'}
                    value={largeBannerUrl}
                    onChange={setLargeBannerUrl}
                    onUpload={(e) => handleImageUpload(e, 'large')}
                    isDarkMode={isDarkMode}
                    isKurdish={isKurdish}
                    typewriterText={typewriterText}
                    businessName={selectedUser ? selectedUser.businessName || 'Froshiar' : 'Froshiar'}
                    showCropGuides={showCropGuides}
                    onToggleCropGuides={() => setShowCropGuides(!showCropGuides)}
                  />
                )}
              </>
            ) : (
              <>
                {activeDeviceTab === 'mobile' && (
                  <DeviceVideoSection
                    device="mobile"
                    title={isKurdish ? 'ڤیدیۆی باکگراوندی مۆبایل (زۆرینە ٢٠ چرکە)' : 'Mobile Background Video (Max 20s)'}
                    subtitle={isKurdish ? 'ڤیدیۆی جووڵاو بۆ مۆبایل • خۆکار دەبڕدرێت و کۆمپریس دەکرێت' : 'Looping video for mobile • Auto-trimmed to 20s & compressed'}
                    value={mobileVideoUrl}
                    onChange={setMobileVideoUrl}
                    onUpload={(e) => handleVideoUpload(e, 'mobile')}
                    isDarkMode={isDarkMode}
                    isKurdish={isKurdish}
                    typewriterText={typewriterText}
                    businessName={selectedUser ? selectedUser.businessName || 'Froshiar' : 'Froshiar'}
                    isProcessing={videoProcessing.isProcessing && videoProcessing.target === 'mobile'}
                    processingProgress={videoProcessing.progress}
                    processingStatus={videoProcessing.statusText}
                    showCropGuides={showCropGuides}
                    onToggleCropGuides={() => setShowCropGuides(!showCropGuides)}
                  />
                )}

                {activeDeviceTab === 'tablet' && (
                  <DeviceVideoSection
                    device="tablet"
                    title={isKurdish ? 'ڤیدیۆی باکگراوندی ئایپاد و تابلێت (زۆرینە ٢٠ چرکە)' : 'iPad Background Video (Max 20s)'}
                    subtitle={isKurdish ? 'ڤیدیۆی جووڵاو بۆ تابلێت و ئایپاد • خۆکار دەبڕدرێت و کۆمپریس دەکرێت' : 'Looping video for iPads • Auto-trimmed to 20s & compressed'}
                    value={ipadVideoUrl}
                    onChange={setIpadVideoUrl}
                    onUpload={(e) => handleVideoUpload(e, 'tablet')}
                    isDarkMode={isDarkMode}
                    isKurdish={isKurdish}
                    typewriterText={typewriterText}
                    businessName={selectedUser ? selectedUser.businessName || 'Froshiar' : 'Froshiar'}
                    isProcessing={videoProcessing.isProcessing && videoProcessing.target === 'tablet'}
                    processingProgress={videoProcessing.progress}
                    processingStatus={videoProcessing.statusText}
                    showCropGuides={showCropGuides}
                    onToggleCropGuides={() => setShowCropGuides(!showCropGuides)}
                  />
                )}

                {activeDeviceTab === 'large' && (
                  <DeviceVideoSection
                    device="large"
                    title={isKurdish ? 'ڤیدیۆی شاشەی گەورە و تابلێتی پان (زۆرینە ٢٠ چرکە)' : 'Large Screen Video (Max 20s)'}
                    subtitle={isKurdish ? 'ڤیدیۆی کوالێتی بەرز بۆ شاشەی پان و کاشێر • خۆکار دەبڕدرێت و کۆمپریس دەکرێت' : 'Widescreen video for desktop • Auto-trimmed to 20s & compressed'}
                    value={largeVideoUrl}
                    onChange={setLargeVideoUrl}
                    onUpload={(e) => handleVideoUpload(e, 'large')}
                    isDarkMode={isDarkMode}
                    isKurdish={isKurdish}
                    typewriterText={typewriterText}
                    businessName={selectedUser ? selectedUser.businessName || 'Froshiar' : 'Froshiar'}
                    isProcessing={videoProcessing.isProcessing && videoProcessing.target === 'large'}
                    processingProgress={videoProcessing.progress}
                    processingStatus={videoProcessing.statusText}
                    showCropGuides={showCropGuides}
                    onToggleCropGuides={() => setShowCropGuides(!showCropGuides)}
                  />
                )}
              </>
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
                {activeMode === 'account' && selectedUser
                  ? isKurdish
                    ? `تێبینی: ڕێکخستنی ئەم وێنە و ڤیدیۆیە تایبەتە بە ئەکاونتی (${selectedUser.email}) و لەسەر ئامێرەکانی ئەو بەکارهێنەرە جێبەجێ دەبێت.`
                    : `Notice: This configuration applies exclusively to (${selectedUser.email}) and will override the global banner on their devices.`
                  : isKurdish
                  ? 'تێبینی: ڕێکخستنی سەرەکی لێرە وەک بنەڕەت بۆ هەموو ئامێرەکان دادەنرێت. لە هەمان کاتدا بەکارهێنەران لە ناو ئەپەکە دەتوانن وێنەی بزنسی خۆیان زیاد بکەن بێ ئەوەی تێکەڵ بێت.'
                  : 'Notice: Global settings apply to all users by default. Local in-app custom banners remain preserved without conflict.'}
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
              <span className="font-bold text-amber-500">
                {holdDuration / 1000} {isKurdish ? 'چرکە' : 'seconds'}
              </span>
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

// ─── HELPER COMPONENT FOR DEVICE IMAGE UPLOAD & LIVE CROP PREVIEW ────────────
interface DeviceImageSectionProps {
  device: 'mobile' | 'tablet' | 'large';
  title: string;
  subtitle: string;
  value: string;
  onChange: (val: string) => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isDarkMode: boolean;
  isKurdish: boolean;
  typewriterText: string;
  businessName: string;
  showCropGuides: boolean;
  onToggleCropGuides: () => void;
}

function DeviceImageSection({
  device,
  title,
  subtitle,
  value,
  onChange,
  onUpload,
  isDarkMode,
  isKurdish,
  typewriterText,
  businessName,
  showCropGuides,
  onToggleCropGuides,
}: DeviceImageSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const aspectClass =
    device === 'mobile'
      ? 'aspect-[16/10] max-w-[340px]'
      : device === 'tablet'
      ? 'aspect-[16/10] max-w-[480px]'
      : 'aspect-[21/9] max-w-[620px]';

  const ratioLabel =
    device === 'mobile'
      ? '16:10 (iPhone & Android)'
      : device === 'tablet'
      ? '16:10 / 4:3 (iPad)'
      : '21:9 (Widescreen Monitor)';

  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${
        isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-slate-50 border-slate-200 shadow-xs'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-amber-500" />
            <span>{title}</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            {ratioLabel}
          </span>
          {value && (
            <button
              onClick={onToggleCropGuides}
              className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 cursor-pointer transition-all ${
                showCropGuides
                  ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                  : isDarkMode
                  ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  : 'bg-white border-slate-300 text-slate-600 hover:text-slate-900'
              }`}
              title={isKurdish ? 'پشکنینی هێڵەکانی کەت بوون و دەق' : 'Toggle crop safe area'}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="text-[11px] font-semibold">{isKurdish ? 'هێڵی کەت بوون' : 'Crop Guide'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Realistic Device Frame & Live Crop Mockup */}
      <div className="relative">
        {value ? (
          <div className="flex flex-col items-center">
            {/* Device Casing Mockup */}
            <div
              className={`relative w-full ${aspectClass} mx-auto rounded-3xl overflow-hidden border-2 shadow-xl ${
                isDarkMode ? 'border-slate-700 bg-slate-950' : 'border-slate-300 bg-slate-900'
              }`}
            >
              {/* Device Notch / Camera / Bezel Details */}
              {device === 'mobile' && (
                <div className="absolute top-2 inset-x-0 z-30 flex justify-between items-center px-4 pointer-events-none">
                  <span className="text-[9px] font-bold text-white/70">09:41</span>
                  {/* Dynamic Island pill */}
                  <div className="w-16 h-3.5 bg-black rounded-full border border-white/10 shadow-sm" />
                  <div className="flex items-center gap-1 text-[8px] text-white/70">
                    <span>5G</span>
                    <div className="w-3.5 h-2 border border-white/70 rounded-xs flex items-center p-0.5">
                      <div className="w-full h-full bg-white/70 rounded-2xs" />
                    </div>
                  </div>
                </div>
              )}

              {device === 'tablet' && (
                <div className="absolute top-1.5 inset-x-0 z-30 flex justify-center pointer-events-none">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-950 border border-white/20" />
                </div>
              )}

              {/* Banner Background Image */}
              <img src={value} alt="Device Banner Preview" className="w-full h-full object-cover" />

              {/* Native App Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/35 to-slate-950/20 pointer-events-none" />

              {/* Crop & Safe Area Visualizer */}
              {showCropGuides && (
                <div className="absolute inset-0 z-20 pointer-events-none p-3 flex flex-col justify-between">
                  <div className="border border-dashed border-amber-400/80 bg-amber-500/15 rounded-lg px-2 py-1 text-[9px] text-amber-300 font-bold self-start backdrop-blur-xs">
                    {isKurdish ? '★ ناوچەی پارێزراوی لۆگۆ و ناوی فرۆشگا' : '★ Brand Safe Zone'}
                  </div>
                  <div className="border border-dashed border-amber-400/80 bg-amber-500/15 rounded-lg px-2 py-1 text-[9px] text-amber-300 font-bold self-end backdrop-blur-xs">
                    {isKurdish ? '★ ناوچەی دەقی تایپینگ (پارێزراو لە بڕین)' : '★ Typewriter Safe Zone'}
                  </div>
                </div>
              )}

              {/* Live Overlay: Brand & Typewriter Simulation */}
              <div className="absolute inset-0 p-4 sm:p-5 flex flex-col justify-between z-10 pointer-events-none">
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black text-[10px] shadow-sm">
                      F
                    </div>
                    <span className="font-bold text-white text-xs tracking-wide drop-shadow-md">
                      {businessName}
                    </span>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/90 backdrop-blur-xs border border-white/15">
                    {ratioLabel}
                  </span>
                </div>

                <div>
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md border border-white/10 shadow-md">
                    <span className="text-[11px] sm:text-xs font-semibold text-amber-400">
                      {typewriterText || (isKurdish ? 'فرۆشیار' : 'Froshiar')}
                    </span>
                    <span className="inline-block w-1.5 h-3 bg-amber-400 animate-pulse rounded-2xs" />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Under Frame */}
            <div className="flex items-center justify-center gap-2 mt-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isKurdish ? 'گۆڕینی وێنە' : 'Change Image'}</span>
              </button>
              <button
                onClick={() => onChange('')}
                className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isKurdish ? 'سڕینەوە' : 'Remove'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`w-full h-40 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-all ${
              isDarkMode
                ? 'border-slate-700 hover:border-amber-500/70 bg-slate-950/40'
                : 'border-slate-300 hover:border-amber-500/70 bg-white'
            }`}
          >
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shadow-xs">
              <Upload className="w-5 h-5" />
            </div>
            <div className="text-center px-4">
              <p className="text-xs font-bold text-slate-200">
                {isKurdish ? `کرتە بکە بۆ هەڵبژاردنی وێنەی ${title}` : `Click to choose ${title}`}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isKurdish
                  ? `ڕێژەی ڕاستەقینەی ئامێر: ${ratioLabel} • فۆرمات: JPG, PNG, WebP`
                  : `Target Ratio: ${ratioLabel} • Format: JPG, PNG, WebP`}
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
      <div className="space-y-1 pt-1">
        <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
          <LinkIcon className="w-3 h-3" />
          <span>{isKurdish ? 'یان لینکی ڕاستەوخۆی وێنەکە (Image URL):' : 'Or direct Image URL:'}</span>
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="https://example.com/banner.jpg"
            value={
              value.startsWith('data:')
                ? isKurdish
                  ? '(وێنەی فایل لە ئامێرەوە بارکراوە)'
                  : '(Uploaded local file)'
                : value
            }
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

// ─── HELPER COMPONENT FOR 20-SECOND BACKGROUND VIDEO WITH CROP & COMPRESSION ─
interface DeviceVideoSectionProps {
  device: 'mobile' | 'tablet' | 'large';
  title: string;
  subtitle: string;
  value: string;
  onChange: (val: string) => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isDarkMode: boolean;
  isKurdish: boolean;
  typewriterText: string;
  businessName: string;
  isProcessing: boolean;
  processingProgress: number;
  processingStatus: string;
  showCropGuides: boolean;
  onToggleCropGuides: () => void;
}

function DeviceVideoSection({
  device,
  title,
  subtitle,
  value,
  onChange,
  onUpload,
  isDarkMode,
  isKurdish,
  typewriterText,
  businessName,
  isProcessing,
  processingProgress,
  processingStatus,
  showCropGuides,
  onToggleCropGuides,
}: DeviceVideoSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const aspectClass =
    device === 'mobile'
      ? 'aspect-[16/10] max-w-[340px]'
      : device === 'tablet'
      ? 'aspect-[16/10] max-w-[480px]'
      : 'aspect-[21/9] max-w-[620px]';

  const ratioLabel =
    device === 'mobile'
      ? '16:10 (iPhone & Android)'
      : device === 'tablet'
      ? '16:10 / 4:3 (iPad)'
      : '21:9 (Widescreen Monitor)';

  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${
        isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-slate-50 border-slate-200 shadow-xs'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2 text-purple-400">
            <Film className="w-4 h-4" />
            <span>{title}</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
            {isKurdish ? 'زۆرینە ٢٠ چرکە • کۆمپرسی خۆکار' : 'Max 20s • Auto-Compressed'}
          </span>
          {value && !isProcessing && (
            <button
              onClick={onToggleCropGuides}
              className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 cursor-pointer transition-all ${
                showCropGuides
                  ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                  : isDarkMode
                  ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  : 'bg-white border-slate-300 text-slate-600 hover:text-slate-900'
              }`}
              title={isKurdish ? 'پشکنینی هێڵەکانی کەت بوون و دەق' : 'Toggle crop safe area'}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="text-[11px] font-semibold">{isKurdish ? 'هێڵی کەت بوون' : 'Crop Guide'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Video In-Progress Banner (Trimming & Compressing) */}
      {isProcessing && (
        <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/40 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-purple-300">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs font-bold">
                {isKurdish ? 'خەریکی بڕین (زۆرینە ٢٠ چرکە) و کۆمپریس کردنە...' : 'Trimming to 20s and compressing...'}
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-amber-400">%{processingProgress}</span>
          </div>

          {/* Animated Progress Bar */}
          <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-purple-500/30">
            <div
              className="h-full bg-gradient-to-r from-purple-500 via-amber-400 to-amber-300 transition-all duration-300"
              style={{ width: `${processingProgress}%` }}
            />
          </div>

          <p className="text-[11px] text-purple-300/80">{processingStatus}</p>
        </div>
      )}

      {/* Video Preview / Drop area */}
      {!isProcessing && (
        <div className="relative">
          {value ? (
            <div className="flex flex-col items-center">
              {/* Realistic Device Frame */}
              <div
                className={`relative w-full ${aspectClass} mx-auto rounded-3xl overflow-hidden border-2 shadow-xl ${
                  isDarkMode ? 'border-purple-500/40 bg-slate-950' : 'border-purple-300 bg-slate-900'
                }`}
              >
                {/* Device Notch / Camera / Bezel Details */}
                {device === 'mobile' && (
                  <div className="absolute top-2 inset-x-0 z-30 flex justify-between items-center px-4 pointer-events-none">
                    <span className="text-[9px] font-bold text-white/70">09:41</span>
                    <div className="w-16 h-3.5 bg-black rounded-full border border-white/10 shadow-sm" />
                    <div className="flex items-center gap-1 text-[8px] text-white/70">
                      <span>5G</span>
                      <div className="w-3.5 h-2 border border-white/70 rounded-xs flex items-center p-0.5">
                        <div className="w-full h-full bg-white/70 rounded-2xs" />
                      </div>
                    </div>
                  </div>
                )}

                {device === 'tablet' && (
                  <div className="absolute top-1.5 inset-x-0 z-30 flex justify-center pointer-events-none">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-950 border border-white/20" />
                  </div>
                )}

                {/* Looping 20-Second Video Element */}
                <video
                  key={`video_crop_${device}_${value}`}
                  src={value}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />

                {/* Native App Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/35 to-slate-950/20 pointer-events-none" />

                {/* Safe Area Crop Guides */}
                {showCropGuides && (
                  <div className="absolute inset-0 z-20 pointer-events-none p-3 flex flex-col justify-between">
                    <div className="border border-dashed border-amber-400/80 bg-amber-500/15 rounded-lg px-2 py-1 text-[9px] text-amber-300 font-bold self-start backdrop-blur-xs">
                      {isKurdish ? '★ ناوچەی پارێزراوی لۆگۆ و ناوی فرۆشگا' : '★ Brand Safe Zone'}
                    </div>
                    <div className="border border-dashed border-amber-400/80 bg-amber-500/15 rounded-lg px-2 py-1 text-[9px] text-amber-300 font-bold self-end backdrop-blur-xs">
                      {isKurdish ? '★ ناوچەی دەقی تایپینگ (پارێزراو لە بڕین)' : '★ Typewriter Safe Zone'}
                    </div>
                  </div>
                )}

                {/* Live Overlays: Brand & Typewriter Simulation */}
                <div className="absolute inset-0 p-4 sm:p-5 flex flex-col justify-between z-10 pointer-events-none">
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black text-[10px] shadow-sm">
                        F
                      </div>
                      <span className="font-bold text-white text-xs tracking-wide drop-shadow-md">
                        {businessName}
                      </span>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 backdrop-blur-xs border border-purple-500/40">
                      {isKurdish ? '٢٠ چرکە' : '20s'} • {ratioLabel}
                    </span>
                  </div>

                  <div>
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md border border-white/10 shadow-md">
                      <span className="text-[11px] sm:text-xs font-semibold text-amber-400">
                        {typewriterText || (isKurdish ? 'فرۆشیار' : 'Froshiar')}
                      </span>
                      <span className="inline-block w-1.5 h-3 bg-amber-400 animate-pulse rounded-2xs" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons Under Frame */}
              <div className="flex items-center justify-center gap-2 mt-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isKurdish ? 'گۆڕینی ڤیدیۆ' : 'Change Video'}</span>
                </button>
                <button
                  onClick={() => onChange('')}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isKurdish ? 'سڕینەوە' : 'Remove'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`w-full h-40 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-all ${
                isDarkMode
                  ? 'border-purple-500/40 hover:border-purple-500/80 bg-purple-950/10'
                  : 'border-purple-300 hover:border-purple-500 bg-purple-50/40'
              }`}
            >
              <div className="w-11 h-11 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center shadow-xs">
                <Film className="w-5 h-5" />
              </div>
              <div className="text-center px-4">
                <p className="text-xs font-bold text-purple-300">
                  {isKurdish
                    ? `کرتە بکە بۆ هەڵبژاردنی ڤیدیۆ (${title})`
                    : `Click to select video for ${title}`}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                  {isKurdish
                    ? `ماوە: زۆرینەی ٢٠ چرکە (ئەگەر ٣٠ چرکەش بێت سیستم خۆکار دەیبڕێت و کۆمپرسی دەکات)`
                    : `Duration: Max 20s (Longer videos will be automatically trimmed to 20s and compressed)`}
                </p>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            onChange={onUpload}
            className="hidden"
          />
        </div>
      )}

      {/* Direct Video URL Input */}
      <div className="space-y-1 pt-1">
        <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
          <LinkIcon className="w-3 h-3" />
          <span>{isKurdish ? 'یان بەستەری ڕاستەوخۆی ڤیدیۆ (Video URL):' : 'Or direct Video URL (.mp4):'}</span>
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="https://example.com/video.mp4"
            value={
              value.startsWith('data:')
                ? isKurdish
                  ? '(فایلی ڤیدیۆ لە ئامێرەوە بارکراوە)'
                  : '(Uploaded local video)'
                : value
            }
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

      {/* iOS Compatibility Info */}
      <div
        className={`mt-2 flex items-start gap-2 p-2.5 rounded-xl text-[11px] leading-relaxed border ${
          isDarkMode
            ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
            : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}
      >
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>
          {isKurdish
            ? 'تێبینی بۆ ئایفۆن (iOS): سیستەمی ئەپڵ تەنها فۆرماتی MP4/MOV دەخوێنێتەوە. بۆ گونجاندنی تەواو لەسەر مۆبایلەکان فایلی MP4 باربکە، یان وێبگەڕی Safari/مۆبایل بەکاربهێنە، یاخود بەستەری ڕاستەوخۆی .mp4 دابنێ.'
            : 'Note for iPhone (iOS): Apple devices support MP4/MOV video format. For seamless iOS playback, upload an MP4 file, use Safari browser, or provide a direct .mp4 URL.'}
        </span>
      </div>
    </div>
  );
}
