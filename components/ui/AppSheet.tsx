import React, { useRef, useState, type ComponentProps, type ReactNode } from 'react';
import {
  Modal,
  View,
  Pressable,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/AppText';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL, RTL_SPACING, useDirectionalChevron } from '@/lib/rtl';
import { Theme } from '@/constants/theme';

const CENTER_THRESHOLD = 0.7;
const SHEET_MAX_HEIGHT_RATIO = 0.85;

interface AppSheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  avoidKeyboard?: boolean;
}

// Opens centered (all corners rounded, equal top/bottom space) when content is
// short; falls back to today's bottom-anchored scrollable sheet when content
// is tall. Decided once per open via a single invisible layout pass — children
// mount exactly once so forms with autoFocus/TextInput never double-render.
export function AppSheet({ visible, onClose, children, avoidKeyboard = true }: AppSheetProps) {
  const { colors } = useAppTheme();
  const { height: screenHeight } = useWindowDimensions();
  const [phase, setPhase] = useState<'sheet' | 'center'>('sheet');
  const [revealed, setRevealed] = useState(false);
  const measuredRef = useRef(false);

  function handleShow() {
    measuredRef.current = false;
    setRevealed(false);
    setPhase('sheet');
  }

  function handleLayout(e: LayoutChangeEvent) {
    if (measuredRef.current) return;
    measuredRef.current = true;
    const h = e.nativeEvent.layout.height;
    setPhase(h < screenHeight * CENTER_THRESHOLD ? 'center' : 'sheet');
    setRevealed(true);
  }

  const isCenter = phase === 'center';
  const Wrapper = avoidKeyboard ? KeyboardAvoidingView : View;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} onShow={handleShow} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <Wrapper
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        pointerEvents="box-none"
        style={isCenter ? styles.centerWrap : styles.bottomWrap}
      >
        <ScrollView
          style={isCenter ? styles.centerScroll : [styles.bottomScroll, { maxHeight: screenHeight * SHEET_MAX_HEIGHT_RATIO }]}
          contentContainerStyle={isCenter ? styles.centerContent : undefined}
          scrollEnabled={revealed}
          bounces={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            onLayout={handleLayout}
            style={[
              styles.card,
              { backgroundColor: colors.white },
              isCenter ? styles.cardCenter : styles.cardSheet,
              !revealed && styles.invisible,
            ]}
          >
            {!isCenter && <View style={[styles.handle, { backgroundColor: colors.gray200 }]} />}
            {children}
          </View>
        </ScrollView>
      </Wrapper>
    </Modal>
  );
}

interface AppSheetHeaderProps {
  title: string;
  onClose?: () => void;
}

export function AppSheetHeader({ title, onClose }: AppSheetHeaderProps) {
  const { colors } = useAppTheme();
  const { flexDirection, textAlign } = useRTL();
  return (
    <View style={[headerStyles.row, { flexDirection }]}>
      <Text style={[headerStyles.title, { color: colors.black, textAlign }]}>{title}</Text>
      {onClose && (
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <Ionicons name="close" size={22} color={colors.gray500} />
        </TouchableOpacity>
      )}
    </View>
  );
}

type IndicatorKind = 'chevron' | 'check' | 'none';

interface AppSheetOptionProps {
  icon?: ComponentProps<typeof Ionicons>['name'];
  label: string;
  subtitle?: string;
  active?: boolean;
  indicator?: IndicatorKind;
  onPress: () => void;
}

// Icon is the first child, the indicator is the last — flexDirection: row-reverse
// in RTL puts the icon on the right and the indicator on the left automatically.
export function AppSheetOption({ icon, label, subtitle, active, indicator = 'chevron', onPress }: AppSheetOptionProps) {
  const { colors } = useAppTheme();
  const { isRTL, flexDirection, textAlign } = useRTL();
  const { chevronForward } = useDirectionalChevron();

  return (
    <TouchableOpacity
      style={[optionStyles.row, { flexDirection, gap: isRTL ? RTL_SPACING.gap : 12 }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {icon && (
        <View style={[optionStyles.iconWrap, { backgroundColor: active ? `${colors.primary}20` : colors.gray100 }]}>
          <Ionicons name={icon} size={18} color={active ? colors.primary : colors.gray600} />
        </View>
      )}
      <View style={optionStyles.textWrap}>
        <Text style={[optionStyles.label, { color: active ? colors.primary : colors.black, textAlign }, active && optionStyles.labelActive]}>
          {label}
        </Text>
        {!!subtitle && (
          <Text style={[optionStyles.subtitle, { color: colors.gray400, textAlign }]}>{subtitle}</Text>
        )}
      </View>
      {indicator === 'chevron' && <Ionicons name={chevronForward as never} size={16} color={colors.gray300} />}
      {indicator === 'check' && active && <Ionicons name="checkmark" size={18} color={colors.primary} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },

  bottomWrap: { flex: 1, justifyContent: 'flex-end' },
  bottomScroll: { width: '100%' },

  centerWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centerScroll: { flex: 1, width: '100%' },
  centerContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Theme.spacing.xl,
    paddingHorizontal: Theme.spacing.lg,
  },

  card: { width: '100%' },
  cardSheet: {
    borderTopLeftRadius: Theme.radius.xl,
    borderTopRightRadius: Theme.radius.xl,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  cardCenter: {
    borderRadius: Theme.radius.xl,
    padding: 20,
    width: '90%',
    maxWidth: 440,
  },
  invisible: { opacity: 0 },

  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
});

const headerStyles = StyleSheet.create({
  row: { alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 17, fontWeight: '800' },
});

const optionStyles = StyleSheet.create({
  row: { alignItems: 'center', paddingVertical: 14, borderRadius: Theme.radius.md },
  iconWrap: { width: 36, height: 36, borderRadius: Theme.radius.md, alignItems: 'center', justifyContent: 'center' },
  textWrap: { flex: 1 },
  label: { fontSize: 14, fontWeight: '600' },
  labelActive: { fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 2 },
});
