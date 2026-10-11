import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { useResponsive } from '@/hooks/useResponsive';

interface Props {
  isKurdish: boolean;
  style?: object;
}

const KURDISH_PHRASES = [
  'فرۆشیار',
  'لەگەڵ فرۆشیار فرۆشتنەکانت ئاسانتر بکە',
  'فرۆشیار پێشکەش بە تۆیە',
];

const ENGLISH_PHRASES = [
  'Froshiar',
  'Make your sales easier with Froshiar',
  'Froshiar is dedicated to you',
];

const TYPING_SPEED = 70; // ms per char
const DELETING_SPEED = 35; // ms per char
const HOLD_DURATION = 5000; // 5 seconds hold as requested by user
const PAUSE_BEFORE_NEXT = 500; // ms pause after erasing

export function HeaderTypewriterText({ isKurdish, style }: Props) {
  const { isTablet } = useResponsive();
  const phrases = useMemo(
    () => (isKurdish ? KURDISH_PHRASES : ENGLISH_PHRASES),
    [isKurdish]
  );

  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);

  // Blinking cursor timer
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, 530);
    return () => clearInterval(cursorInterval);
  }, []);

  // Main typing engine
  useEffect(() => {
    const currentPhrase = phrases[phraseIndex % phrases.length];
    let timer: ReturnType<typeof setTimeout>;

    if (!isDeleting) {
      // TYPING FORWARD
      if (displayText.length < currentPhrase.length) {
        timer = setTimeout(() => {
          setDisplayText(currentPhrase.slice(0, displayText.length + 1));
        }, TYPING_SPEED);
      } else {
        // FINISHED TYPING: Hold for 5 seconds (٥ سانیە)
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, HOLD_DURATION);
      }
    } else {
      // DELETING BACKWARD
      if (displayText.length > 0) {
        timer = setTimeout(() => {
          setDisplayText(currentPhrase.slice(0, displayText.length - 1));
        }, DELETING_SPEED);
      } else {
        // FINISHED ERASING: Short pause, then next phrase
        timer = setTimeout(() => {
          setIsDeleting(false);
          setPhraseIndex((prev) => (prev + 1) % phrases.length);
        }, PAUSE_BEFORE_NEXT);
      }
    }

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, phraseIndex, phrases]);

  // Reset when language changes
  useEffect(() => {
    setDisplayText('');
    setIsDeleting(false);
    setPhraseIndex(0);
  }, [isKurdish]);

  return (
    <View style={[styles.container, style]}>
      <Text
        style={[
          styles.text,
          { fontSize: isTablet ? 13.5 : 11.5 },
          isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
        ]}
        numberOfLines={1}
      >
        {displayText}
        <Text style={[styles.cursor, { opacity: cursorVisible ? 0.9 : 0 }]}> |</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 22,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  text: {
    color: 'rgba(255, 255, 255, 0.88)',
    fontWeight: '700',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cursor: {
    color: '#FDE047', // Froshiar bright yellow/gold for glowing cursor
    fontWeight: '900',
  },
});
