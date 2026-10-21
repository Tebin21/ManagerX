import React from 'react';
import * as ReactNative from 'react-native';
import { toEnglishDigits } from '@/utils/formatters';

/**
 * Context to designate auth/login screens where digit conversion should be skipped.
 * The login section (login, signup, forgot password, OTP) remains untouched so user
 * passwords and credentials are never altered.
 */
export const AuthInputContext = React.createContext<boolean>(false);

let isInstalled = false;

// Patch globalThis.parseFloat and globalThis.parseInt to transparently handle Eastern/Persian numerals
if (typeof globalThis !== 'undefined') {
  const origParseFloat = globalThis.parseFloat;
  if (typeof origParseFloat === 'function' && !(origParseFloat as any).__autoEnglishPatched) {
    const patchedParseFloat = function (string: any) {
      if (typeof string === 'string' && /[٠-٩۰-۹٫٬]/.test(string)) {
        return origParseFloat(toEnglishDigits(string).replace(/,/g, ''));
      }
      return origParseFloat(string);
    };
    (patchedParseFloat as any).__autoEnglishPatched = true;
    globalThis.parseFloat = patchedParseFloat;
  }

  const origParseInt = globalThis.parseInt;
  if (typeof origParseInt === 'function' && !(origParseInt as any).__autoEnglishPatched) {
    const patchedParseInt = function (string: any, radix?: number) {
      if (typeof string === 'string' && /[٠-٩۰-۹٫٬]/.test(string)) {
        return origParseInt(toEnglishDigits(string).replace(/,/g, ''), radix);
      }
      return origParseInt(string, radix);
    };
    (patchedParseInt as any).__autoEnglishPatched = true;
    globalThis.parseInt = patchedParseInt;
  }
}

export function transformInputProps(props: any): any {
  if (!props) return props;

  let isAuth = false;
  try {
    isAuth = React.useContext(AuthInputContext);
  } catch {
    isAuth = false;
  }

  // Skip conversion if inside login/auth flow, or password field, or explicitly opted out
  if (
    isAuth ||
    props.skipEnglishDigitsConversion ||
    props.secureTextEntry ||
    props.textContentType === 'password' ||
    props.textContentType === 'newPassword'
  ) {
    return props;
  }

  let modifiedProps = props;
  let cloned = false;

  const cloneIfNeeded = () => {
    if (!cloned) {
      modifiedProps = { ...props };
      cloned = true;
    }
  };

  // 1. Convert text as user types/pastes via onChangeText
  if (typeof props.onChangeText === 'function') {
    const origOnChangeText = props.onChangeText;
    if (!(origOnChangeText as any).__autoEnglishWrapped) {
      cloneIfNeeded();
      const wrapped = (text: string) => {
        origOnChangeText(toEnglishDigits(text));
      };
      (wrapped as any).__autoEnglishWrapped = true;
      modifiedProps.onChangeText = wrapped;
    }
  }

  // 2. Convert native onChange event
  if (typeof props.onChange === 'function') {
    const origOnChange = props.onChange;
    if (!(origOnChange as any).__autoEnglishWrapped) {
      cloneIfNeeded();
      const wrapped = (e: any) => {
        if (e?.nativeEvent?.text && /[٠-٩۰-۹٫٬]/.test(e.nativeEvent.text)) {
          e = {
            ...e,
            nativeEvent: {
              ...e.nativeEvent,
              text: toEnglishDigits(e.nativeEvent.text),
            },
          };
        }
        origOnChange(e);
      };
      (wrapped as any).__autoEnglishWrapped = true;
      modifiedProps.onChange = wrapped;
    }
  }

  // 3. Convert controlled value if it contains Eastern/Persian numerals
  if (typeof props.value === 'string' && /[٠-٩۰-۹٫٬]/.test(props.value)) {
    cloneIfNeeded();
    modifiedProps.value = toEnglishDigits(props.value);
  }

  // 4. Convert defaultValue if it contains Eastern/Persian numerals
  if (typeof props.defaultValue === 'string' && /[٠-٩۰-۹٫٬]/.test(props.defaultValue)) {
    cloneIfNeeded();
    modifiedProps.defaultValue = toEnglishDigits(props.defaultValue);
  }

  // 5. Convert placeholder if it contains Eastern/Persian numerals
  if (typeof props.placeholder === 'string' && /[٠-٩۰-۹٫٬]/.test(props.placeholder)) {
    cloneIfNeeded();
    modifiedProps.placeholder = toEnglishDigits(props.placeholder);
  }

  return modifiedProps;
}

function patchJsxRuntime(mod: any) {
  if (!mod) return;
  const methods = ['jsx', 'jsxs', 'jsxDEV', 'createInteropElement'];
  for (const m of methods) {
    if (typeof mod[m] === 'function' && !mod[m].__autoEnglishPatched) {
      const orig = mod[m];
      const patched = function (type: any, props: any, ...rest: any[]) {
        if (props && typeof props === 'object') {
          if (
            typeof props.onChangeText === 'function' ||
            (typeof props.value === 'string' && /[٠-٩۰-۹٫٬]/.test(props.value)) ||
            (typeof props.defaultValue === 'string' && /[٠-٩۰-۹٫٬]/.test(props.defaultValue))
          ) {
            props = transformInputProps(props);
          }
        }
        return orig.call(this, type, props, ...rest);
      };
      patched.__autoEnglishPatched = true;
      mod[m] = patched;
    }
  }
}

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

  const OriginalTextInput: any = ReactNative.TextInput;
  if (!OriginalTextInput) return;

  // 1. If OriginalTextInput has a render method (legacy forwardRef/class), wrap it
  if (typeof OriginalTextInput.render === 'function') {
    const originalRender = OriginalTextInput.render;
    OriginalTextInput.render = function (props: any, ref: any) {
      const modifiedProps = transformInputProps(props);
      return originalRender.call(this, modifiedProps, ref);
    };
  }

  // 2. Wrap OriginalTextInput as a modern functional forwardRef component
  const WrappedTextInput = React.forwardRef<any, any>(function WrappedTextInput(props: any, ref: any) {
    const modifiedProps = transformInputProps(props);
    return React.createElement(OriginalTextInput, { ...modifiedProps, ref });
  });

  // Preserve all static properties (State, displayName, constants, etc.)
  Object.assign(WrappedTextInput, OriginalTextInput);
  WrappedTextInput.displayName = 'TextInput';

  // 3. Redefine property on ReactNative module
  try {
    Object.defineProperty(ReactNative, 'TextInput', {
      configurable: true,
      enumerable: true,
      get: () => WrappedTextInput,
      set: () => {},
    });
  } catch {
    try {
      (ReactNative as any).TextInput = WrappedTextInput;
    } catch {}
  }

  // 4. Also patch direct internal module require if resolved
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const directModule = require('react-native/Libraries/Components/TextInput/TextInput');
    if (directModule && directModule.default) {
      directModule.default = WrappedTextInput;
    }
  } catch {}

  // 5. Patch NativeWind and React JSX runtimes so that any <TextInput> anywhere in JSX automatically gets transformed props
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nwJsx = require('nativewind/jsx-runtime');
    patchJsxRuntime(nwJsx);
  } catch {}

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const interopJsx = require('react-native-css-interop/dist/runtime/jsx-runtime');
    patchJsxRuntime(interopJsx);
  } catch {}

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const reactJsx = require('react/jsx-runtime');
    patchJsxRuntime(reactJsx);
  } catch {}

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const reactJsxDev = require('react/jsx-dev-runtime');
    patchJsxRuntime(reactJsxDev);
  } catch {}

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ReactMod = require('react');
    if (ReactMod && typeof ReactMod.createElement === 'function' && !ReactMod.createElement.__autoEnglishPatched) {
      const origCreateElement = ReactMod.createElement;
      const patchedCreateElement = function (type: any, props: any, ...children: any[]) {
        if (props && typeof props === 'object' && typeof props.onChangeText === 'function') {
          props = transformInputProps(props);
        }
        return origCreateElement.call(ReactMod, type, props, ...children);
      };
      patchedCreateElement.__autoEnglishPatched = true;
      ReactMod.createElement = patchedCreateElement;
    }
  } catch {}
}

// Auto-run on module import so it is active immediately
installAutoEnglishDigits();
