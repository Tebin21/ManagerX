import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useImperativeHandle,
} from 'react';
import {
  Dimensions,
  Keyboard,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  ScrollViewProps,
  TextInputProps,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

type FocusHandler = NonNullable<TextInputProps['onFocus']>;
type FocusedTarget = Parameters<FocusHandler>[0]['target'];

const KeyboardAwareFocusContext = createContext<FocusHandler | null>(null);

/**
 * Spread the returned handler onto any TextInput's `onFocus` (compose with the
 * input's own onFocus if it already has one). It scrolls that input above the
 * keyboard whenever it sits inside a `KeyboardAwareScrollView` ancestor, and is a
 * harmless no-op outside one — safe to wire into shared input components.
 */
export function useKeyboardAwareFocus(): FocusHandler {
  const notify = useContext(KeyboardAwareFocusContext);
  return useCallback<FocusHandler>((e) => {
    notify?.(e);
  }, [notify]);
}

// Breathing room kept between the focused field and the top edge of the keyboard.
const EXTRA_SPACE_ABOVE_KEYBOARD = 16;

interface Props extends ScrollViewProps {
  children: React.ReactNode;
  /** Empty space rendered after the content so the last field can clear the keyboard. Default 80. */
  extraScrollSpace?: number;
  /**
   * Wraps children in a tap-to-dismiss layer. Turn off for ScrollViews that rely on
   * `stickyHeaderIndices` (which needs the original direct-children structure) —
   * taps still dismiss the keyboard via scroll-begin-drag in that case.
   */
  wrapForTapDismiss?: boolean;
}

/**
 * Drop-in replacement for React Native's `ScrollView` that keeps the focused
 * TextInput visible above the keyboard and dismisses the keyboard on an outside
 * tap or on scroll. Render inside a `KeyboardAvoidingView` (behavior: 'padding' on
 * iOS) so the screen itself also yields room to the keyboard on iOS.
 */
export const KeyboardAwareScrollView = forwardRef<ScrollView, Props>(
  function KeyboardAwareScrollView(
    {
      children,
      extraScrollSpace = 80,
      wrapForTapDismiss = true,
      keyboardShouldPersistTaps = 'handled',
      scrollEventThrottle = 16,
      onScroll,
      onScrollBeginDrag,
      ...rest
    },
    forwardedRef,
  ) {
    const scrollRef = useRef<ScrollView>(null);
    useImperativeHandle(forwardedRef, () => scrollRef.current as ScrollView);

    const scrollOffsetY = useRef(0);
    const keyboardHeight = useRef(0);
    const focusedTarget = useRef<FocusedTarget | null>(null);

    const measureAndScroll = useCallback(() => {
      const target = focusedTarget.current;
      if (target == null || keyboardHeight.current <= 0) return;
      requestAnimationFrame(() => {
        if (focusedTarget.current !== target) return;
        target.measureInWindow((_x, y, width, height) => {
          if (height === 0 && width === 0 && y === 0) return; // measurement failed
          const screenHeight = Dimensions.get('window').height;
          const visibleBottom = screenHeight - keyboardHeight.current;
          const overlap = y + height - visibleBottom + EXTRA_SPACE_ABOVE_KEYBOARD;
          if (overlap > 0) {
            scrollRef.current?.scrollTo({
              y: Math.max(0, scrollOffsetY.current + overlap),
              animated: true,
            });
          }
        });
      });
    }, []);

    const handleFocus = useCallback<FocusHandler>((e) => {
      focusedTarget.current = e.target;
      measureAndScroll();
    }, [measureAndScroll]);

    useEffect(() => {
      const onShow = (e: { endCoordinates?: { height: number } }) => {
        keyboardHeight.current = e.endCoordinates?.height ?? 0;
        measureAndScroll();
      };
      const onHide = () => { keyboardHeight.current = 0; };
      const subs = [
        Keyboard.addListener('keyboardWillShow', onShow),
        Keyboard.addListener('keyboardDidShow', onShow),
        Keyboard.addListener('keyboardWillHide', onHide),
        Keyboard.addListener('keyboardDidHide', onHide),
      ];
      return () => subs.forEach((s) => s.remove());
    }, [measureAndScroll]);

    const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollOffsetY.current = e.nativeEvent.contentOffset.y;
      onScroll?.(e);
    }, [onScroll]);

    const handleScrollBeginDrag = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
      Keyboard.dismiss();
      onScrollBeginDrag?.(e);
    }, [onScrollBeginDrag]);

    const content = wrapForTapDismiss ? (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View>{children}</View>
      </TouchableWithoutFeedback>
    ) : children;

    return (
      <KeyboardAwareFocusContext.Provider value={handleFocus}>
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          scrollEventThrottle={scrollEventThrottle}
          onScroll={handleScroll}
          onScrollBeginDrag={handleScrollBeginDrag}
          {...rest}
        >
          {content}
          {extraScrollSpace > 0 && <View style={{ height: extraScrollSpace }} />}
        </ScrollView>
      </KeyboardAwareFocusContext.Provider>
    );
  },
);
