import { TextStyle, ViewStyle } from 'react-native';
import { useLanguageStore } from '@/store/languageStore';

export function useRTL() {
  const isRTL = useLanguageStore((s) => s.isRTL);
  return {
    isRTL,
    textAlign:        (isRTL ? 'right'       : 'left')       as TextStyle['textAlign'],
    writingDirection: (isRTL ? 'rtl'         : 'ltr')        as TextStyle['writingDirection'],
    flexDirection:    (isRTL ? 'row-reverse' : 'row')        as ViewStyle['flexDirection'],
    alignEnd:         (isRTL ? 'flex-start'  : 'flex-end')   as ViewStyle['alignItems'],
    alignStart:       (isRTL ? 'flex-end'    : 'flex-start') as ViewStyle['alignItems'],
  };
}

// Use for navigation icons that should mirror in RTL (chevrons, arrows).
// Do NOT use for home/settings/product/brand icons.
export function useDirectionalChevron() {
  const isRTL = useLanguageStore((s) => s.isRTL);
  return {
    chevronForward:       (isRTL ? 'chevron-back'          : 'chevron-forward')         as string,
    chevronBack:          (isRTL ? 'chevron-forward'       : 'chevron-back')             as string,
    arrowForward:         (isRTL ? 'arrow-back'            : 'arrow-forward')            as string,
    arrowForwardOutline:  (isRTL ? 'arrow-back-outline'    : 'arrow-forward-outline')    as string,
  };
}
