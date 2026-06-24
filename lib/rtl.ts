import { TextStyle, ViewStyle } from 'react-native';
import { useLanguageStore } from '@/store/languageStore';

export function useRTL() {
  const isRTL = useLanguageStore((s) => s.isRTL);
  return {
    isRTL,
    textAlign:        (isRTL ? 'right'       : 'left')       as TextStyle['textAlign'],
    // For standalone value text (prices, IDs, dates...) paired with a label
    // rendered in its own Text node — values dock to the opposite edge from
    // labels, so they stay visually anchored to the same side in both
    // directions. Don't use this on a Text that mixes a label and a value
    // together (e.g. "Remaining: 1,000 IQD") — textAlign already handles
    // that correctly via Unicode bidi.
    valueAlign:       (isRTL ? 'left'        : 'right')      as TextStyle['textAlign'],
    writingDirection: (isRTL ? 'rtl'         : 'ltr')        as TextStyle['writingDirection'],
    flexDirection:    (isRTL ? 'row-reverse' : 'row')        as ViewStyle['flexDirection'],
    alignEnd:         (isRTL ? 'flex-start'  : 'flex-end')   as ViewStyle['alignItems'],
    alignStart:       (isRTL ? 'flex-end'    : 'flex-start') as ViewStyle['alignItems'],
  };
}

// Extra breathing room for Kurdish (RTL) screens only — Kurdish script/labels
// read cramped at the same gaps that work fine for English. These are target
// values for the RTL side ONLY: always apply as
//   isRTL ? RTL_SPACING.gapLg : <the original LTR literal>
// Never use a value here as a flat replacement for both directions — that
// would change the LTR layout, which must stay pixel-for-pixel unchanged.
export const RTL_SPACING = {
  gapSm:   8,   // small inline icon + label gap (phone/date/footer rows)
  gap:     14,  // icon/content gap inside list rows, cards, top rows
  gapLg:   16,  // icon-wrap -> content block gap (settings rows, avatars)
  gapXl:   20,  // icon-wrap -> content block gap for Settings list rows only
                // (SettingRow/SettingSwitch/SettingSection) — extra room so the
                // icon never reads as "attached" to Kurdish script labels.
  title:   5,   // vertical gap between a title and its subtitle line
  rowPadV: 14,  // vertical padding for list/option rows
  cardPad: 18,  // padding inside cards
};

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
