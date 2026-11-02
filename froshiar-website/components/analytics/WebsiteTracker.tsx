'use client';

import { useEffect } from 'react';
import {
  initWebsiteTracker,
  trackAppDownload,
  trackBexdrVisit,
  trackSectionView,
} from '@/lib/analytics/websiteTracker';

export function WebsiteTracker({ locale = 'ckb' }: { locale?: string }) {
  useEffect(() => {
    // Initialize session & heartbeat in Firestore
    initWebsiteTracker(locale);

    // Global click listener to capture downloads, Bexdre visits, and section navigation
    function handleGlobalClick(e: MouseEvent) {
      const target = (e.target as HTMLElement)?.closest('a, button');
      if (!target) return;

      const href = target.getAttribute('href') || '';
      const text = (target.textContent || '').trim().toLowerCase();

      // 1. Apple App Store Download Click
      if (
        href.includes('apple.com') ||
        href.includes('id6795295325') ||
        (href.includes('#download') && text.includes('apple'))
      ) {
        trackAppDownload('ios', 'Apple App Store Button');
        return;
      }

      // 2. Google Play Download Click
      if (
        href.includes('play.google.com') ||
        href.includes('com.froshiar.app') ||
        (href.includes('#download') && text.includes('google'))
      ) {
        trackAppDownload('android', 'Google Play Store Button');
        return;
      }

      // 3. BexDre Website Link Click
      if (
        href.includes('bexdre.com') ||
        text.includes('bexdre') ||
        target.getAttribute('data-track') === 'bexdr'
      ) {
        trackBexdrVisit(href.includes('footer') ? 'Footer' : 'Link');
        return;
      }

      // 4. Section Anchor Click
      if (href.startsWith('#')) {
        const sectionName = href.replace('#', '');
        if (sectionName) {
          trackSectionView(sectionName);
        }
      }
    }

    document.addEventListener('click', handleGlobalClick, { capture: true });

    // Section view observer using IntersectionObserver
    let observer: IntersectionObserver | null = null;
    try {
      const sectionIds = ['home', 'showcase', 'features', 'download', 'contact'];
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
              const id = entry.target.id;
              if (id) {
                trackSectionView(id);
              }
            }
          });
        },
        { threshold: [0.35] }
      );

      sectionIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el && observer) {
          observer.observe(el);
        }
      });
    } catch {
      // Fail-safe
    }

    return () => {
      document.removeEventListener('click', handleGlobalClick, { capture: true });
      if (observer) {
        observer.disconnect();
      }
    };
  }, [locale]);

  return null;
}
