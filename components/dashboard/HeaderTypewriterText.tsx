import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { useResponsive } from '@/hooks/useResponsive';
import { useRemoteBannerConfig } from '@/lib/remoteBannerConfig';

interface Props {
  isKurdish: boolean;
  isArabic?: boolean;
  style?: object;
}

const KURDISH_PHRASES = [
  'فرۆشیار',
  'لەگەڵ فرۆشیار فرۆشتنەکانت ئاسانتر بکە',
  'فرۆشیار پێشکەش بە تۆیە',
];

const ARABIC_PHRASES = [
  'فروشیار',
  'اجعل مبيعاتك أسهل مع فروشیار',
  'فروشیار في خدمتكم دائماً',
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

function HeaderTypewriterTextImpl({ isKurdish, isArabic, style }: Props) {
  const { isTablet } = useResponsive();
  const { config } = useRemoteBannerConfig();

  const phrases = useMemo(() => {
    if (isArabic) {
      return config?.arabicPhrases && config.arabicPhrases.length > 0
        ? config.arabicPhrases
        : ARABIC_PHRASES;
    }
    if (isKurdish) {
      return config?.kurdishPhrases && config.kurdishPhrases.length > 0
        ? config.kurdishPhrases
        : KURDISH_PHRASES;
    }
    return config?.englishPhrases && config.englishPhrases.length > 0
      ? config.englishPhrases
      : ENGLISH_PHRASES;
  }, [isArabic, isKurdish, config?.arabicPhrases, config?.kurdishPhrases, config?.englishPhrases]);

  const activeTypingSpeed = config?.typingSpeed || TYPING_SPEED;
  const activeDeletingSpeed = config?.deletingSpeed || DELETING_SPEED;
  const activeHoldDuration = config?.holdDuration || HOLD_DURATION;

  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const cursorOpacity = useRef(new Animated.Value(1)).current;

  // Blinking cursor runs entirely on native thread via Animated.loop (zero JS re-renders)
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(cursorOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [cursorOpacity]);

  // Main typing engine
  useEffect(() => {
    if (!phrases || phrases.length === 0) return;
    const currentPhrase = phrases[phraseIndex % phrases.length] || '';
    let timer: ReturnType<typeof setTimeout>;

    if (!isDeleting) {
      // TYPING FORWARD
      if (displayText.length < currentPhrase.length) {
        timer = setTimeout(() => {
          setDisplayText(currentPhrase.slice(0, displayText.length + 1));
        }, activeTypingSpeed);
      } else {
        // FINISHED TYPING: Hold for holdDuration
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, activeHoldDuration);
      }
    } else {
      // DELETING BACKWARD
      if (displayText.length > 0) {
        timer = setTimeout(() => {
          setDisplayText(currentPhrase.slice(0, displayText.length - 1));
        }, activeDeletingSpeed);
      } else {
        // FINISHED ERASING: Short pause, then next phrase
        timer = setTimeout(() => {
          setIsDeleting(false);
          setPhraseIndex((prev) => (prev + 1) % phrases.length);
        }, PAUSE_BEFORE_NEXT);
      }
    }

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, phraseIndex, phrases, activeTypingSpeed, activeDeletingSpeed, activeHoldDuration]);

  // Reset when language or phrases change
  useEffect(() => {
    setDisplayText('');
    setIsDeleting(false);
    setPhraseIndex(0);
  }, [isKurdish, isArabic, phrases]);

  return (
    <View style={[styles.container, style]}>
      <Text
        style={[
          styles.text,
          { fontSize: isTablet ? 13.5 : 11.5 },
          (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
        ]}
        numberOfLines={1}
      >
        {displayText}
        <Animated.Text style={[styles.cursor, { opacity: cursorOpacity }]}> |</Animated.Text>
      </Text>
    </View>
  );
}

export const HeaderTypewriterText = React.memo(HeaderTypewriterTextImpl);

const styles = StyleSheet.create({
  container: {
    minHeight: 22,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  text: {
    color: 'rgba(255, 255, 255, 0.88)',
    fontWeight: '700',
    letterSpacing: 0.3,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cursor: {
    color: '#FFFFFF', // Pure white cursor as requested
    fontWeight: '900',
  },
});
