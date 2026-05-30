import { TextStyle, ViewStyle } from 'react-native';
import { useLanguageStore } from '@/store/languageStore';

export function useRTL() {
  const isRTL = useLanguageStore((s) => s.isRTL);
  return {
    isRTL,
    textAlign: (isRTL ? 'right' : 'left') as TextStyle['textAlign'],
    writingDirection: (isRTL ? 'rtl' : 'ltr') as TextStyle['writingDirection'],
    rowReverse: (isRTL ? 'row-reverse' : 'row') as ViewStyle['flexDirection'],
  };
}
