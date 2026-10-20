import React from 'react';
import { TextInput } from 'react-native';
import { toEnglishDigits } from '@/utils/formatters';

/**
 * Context to designate auth/login screens where digit conversion should be skipped.
 * The login section (login, signup, forgot password, OTP) remains untouched so user
 * passwords and credentials are never altered.
 */
export const AuthInputContext = React.createContext<boolean>(false);

let isInstalled = false;

/**
 * Automatically converts any Eastern Arabic (٠١٢٣٤٥٦٧٨٩) and Persian (۰۱۲۳۴۵۶۷۸۹)
 * digits entered into any TextInput in the system into standard English (0123456789) digits.
 *
 * Covers:
 * - Keyboard typing via onChangeText
 * - Pasted values
 * - Controlled `value` and `defaultValue`
 * - Skips fields in auth/login screens (via AuthInputContext)
 * - Skips password fields (secureTextEntry)
 * - Skips fields explicitly setting skipEnglishDigitsConversion={true}
 */
export function installAutoEnglishDigits(): void {
  if (isInstalled) return;
  isInstalled = true;

  const originalRender = (TextInput as any).render;
  if (typeof originalRender !== 'function') return;

  (TextInput as any).render = function (props: any, ref: any) {
    if (!props) {
      return originalRender.call(this, props, ref);
    }

    const isAuth = React.useContext(AuthInputContext);

    // Skip conversion if inside login/auth flow, or password field, or explicitly opted out
    if (
      isAuth ||
      props.skipEnglishDigitsConversion ||
      props.secureTextEntry ||
      props.textContentType === 'password' ||
      props.textContentType === 'newPassword'
    ) {
      return originalRender.call(this, props, ref);
    }

    let modifiedProps = props;
    let needsClone = false;

    // Convert text as user types/pastes via onChangeText
    if (typeof props.onChangeText === 'function') {
      const origOnChangeText = props.onChangeText;
      if (!needsClone) {
        modifiedProps = { ...props };
        needsClone = true;
      }
      modifiedProps.onChangeText = (text: string) => {
        const converted = toEnglishDigits(text);
        origOnChangeText(converted);
      };
    }

    // Convert controlled value if it contains Eastern/Persian numerals
    if (typeof props.value === 'string' && /[٠-٩۰-۹]/.test(props.value)) {
      if (!needsClone) {
        modifiedProps = { ...props };
        needsClone = true;
      }
      modifiedProps.value = toEnglishDigits(props.value);
    }

    // Convert defaultValue if it contains Eastern/Persian numerals
    if (typeof props.defaultValue === 'string' && /[٠-٩۰-۹]/.test(props.defaultValue)) {
      if (!needsClone) {
        modifiedProps = { ...props };
        needsClone = true;
      }
      modifiedProps.defaultValue = toEnglishDigits(props.defaultValue);
    }

    // Convert placeholder if it contains Eastern/Persian numerals
    if (typeof props.placeholder === 'string' && /[٠-٩۰-۹]/.test(props.placeholder)) {
      if (!needsClone) {
        modifiedProps = { ...props };
        needsClone = true;
      }
      modifiedProps.placeholder = toEnglishDigits(props.placeholder);
    }

    return originalRender.call(this, modifiedProps, ref);
  };
}
