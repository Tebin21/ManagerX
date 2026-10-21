import React from 'react';
import * as ReactNative from 'react-native';
import { toEnglishDigits } from '@/utils/formatters';

let isInstalled = false;
let isAuthScreenActive = false;

/**
 * Sets whether the user is currently on an auth/login screen.
 * When true, auto English digit conversion is paused so passwords
 * and credentials are never altered.
 */
export function setAuthScreenActive(active: boolean): void {
  isAuthScreenActive = active;
}

export function getAuthScreenActive(): boolean {
  return isAuthScreenActive;
}

/**
 * React Context for auth/login screens (also sets module-level flag for zero-hook JSX lookups).
 */
export const AuthInputContext = React.createContext<boolean>(false);

// Patch globalThis.parseFloat and globalThis.parseInt to transparently handle Eastern/Persian numerals
if (typeof globalThis !== 'undefined') {
  const origParseFloat = globalThis.parseFloat;
  if (typeof origParseFloat === 'function' && !(origParseFloat as any).__autoEnglishPatched) {
    const patchedParseFloat = function (string: any) {
      if (typeof string === 'string') {
        if (/[٠-٩۰-۹٫٬،]/.test(string)) {
          return origParseFloat(toEnglishDigits(string).replace(/,/g, ''));
        }
        if (/^\s*[+-]?\d{1,3}(,\d{3})+(\.\d+)?\s*$/.test(string)) {
          return origParseFloat(string.replace(/,/g, ''));
        }
      }
      return origParseFloat(string);
    };
    (patchedParseFloat as any).__autoEnglishPatched = true;
    globalThis.parseFloat = patchedParseFloat;
  }

  const origParseInt = globalThis.parseInt;
  if (typeof origParseInt === 'function' && !(origParseInt as any).__autoEnglishPatched) {
    const patchedParseInt = function (string: any, radix?: number) {
      if (typeof string === 'string') {
        if (/[٠-٩۰-۹٫٬،]/.test(string)) {
          return origParseInt(toEnglishDigits(string).replace(/,/g, ''), radix);
        }
        if (/^\s*[+-]?\d{1,3}(,\d{3})+\s*$/.test(string)) {
          return origParseInt(string.replace(/,/g, ''), radix);
        }
      }
      return origParseInt(string, radix);
    };
    (patchedParseInt as any).__autoEnglishPatched = true;
    globalThis.parseInt = patchedParseInt;
  }
}

/**
 * Transforms props of any text input so that Kurdish/Eastern Arabic digits
 * are seamlessly normalized to standard English ASCII digits (0-9).
 * Contains NO React hooks so it can be called safely anywhere.
 */
export function transformInputProps(props: any): any {
  if (!props || typeof props !== 'object') return props;

  // Skip conversion if inside login/auth flow, or password field, or explicitly opted out
  if (
    isAuthScreenActive ||
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

  // 1. Convert text as user types or pastes via onChangeText
  if (typeof props.onChangeText === 'function') {
    const origOnChangeText = props.onChangeText;
    if (!(origOnChangeText as any).__autoEnglishWrapped) {
      cloneIfNeeded();
      const wrapped = (text: string) => {
        const clean = toEnglishDigits(text);
        origOnChangeText(clean);
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
        if (e?.nativeEvent?.text && /[٠-٩۰-۹٫٬،]/.test(e.nativeEvent.text)) {
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
  if (typeof props.value === 'string' && /[٠-٩۰-۹٫٬،]/.test(props.value)) {
    cloneIfNeeded();
    modifiedProps.value = toEnglishDigits(props.value);
  }

  // 4. Convert defaultValue if it contains Eastern/Persian numerals
  if (typeof props.defaultValue === 'string' && /[٠-٩۰-۹٫٬،]/.test(props.defaultValue)) {
    cloneIfNeeded();
    modifiedProps.defaultValue = toEnglishDigits(props.defaultValue);
  }

  // 5. Convert placeholder if it contains Eastern/Persian numerals
  if (typeof props.placeholder === 'string' && /[٠-٩۰-۹٫٬،]/.test(props.placeholder)) {
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
      const patched = function (this: any, type: any, props: any, ...rest: any[]) {
        if (props && typeof props === 'object') {
          if (
            typeof props.onChangeText === 'function' ||
            (typeof props.value === 'string' && /[٠-٩۰-۹٫٬،]/.test(props.value)) ||
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
 * - Skips fields in auth/login screens
 * - Skips password fields (secureTextEntry)
 * - Skips fields explicitly setting skipEnglishDigitsConversion={true}
 */
export function installAutoEnglishDigits(): void {
  if (isInstalled) return;
  isInstalled = true;

  const OriginalTextInput: any = ReactNative.TextInput;
  if (!OriginalTextInput) return;

  // 1. Wrap OriginalTextInput as a functional forwardRef component
  const WrappedTextInput = React.forwardRef<any, any>(function WrappedTextInput(props: any, ref: any) {
    const modifiedProps = transformInputProps(props);
    return React.createElement(OriginalTextInput, { ...modifiedProps, ref });
  });

  // Preserve all static properties (State, displayName, constants, etc.)
  Object.assign(WrappedTextInput, OriginalTextInput);
  WrappedTextInput.displayName = 'TextInput';

  // 2. Redefine property on ReactNative module
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

  // 3. Patch direct internal module require if resolved
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const directModule = require('react-native/Libraries/Components/TextInput/TextInput');
    if (directModule && directModule.default) {
      directModule.default = WrappedTextInput;
    }
  } catch {}

  // 4. Patch react-native-css-interop components map so NativeWind styled inputs are wrapped
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cssApi = require('react-native-css-interop/dist/runtime/api');
    if (cssApi && cssApi.interopComponents) {
      const origGet = cssApi.interopComponents.get.bind(cssApi.interopComponents);
      cssApi.interopComponents.get = function (key: any) {
        const comp = origGet(key);
        if (!comp) return comp;
        if (key === OriginalTextInput || key === WrappedTextInput || comp.displayName === 'TextInput') {
          if (!(comp as any).__autoEnglishWrapped) {
            const InteropWrapped = React.forwardRef<any, any>(function (props: any, ref: any) {
              const modifiedProps = transformInputProps(props);
              return React.createElement(comp, { ...modifiedProps, ref });
            });
            Object.assign(InteropWrapped, comp);
            (InteropWrapped as any).__autoEnglishWrapped = true;
            return InteropWrapped;
          }
        }
        return comp;
      };

      const existing = origGet(OriginalTextInput);
      if (existing && !(existing as any).__autoEnglishWrapped) {
        const InteropWrapped = React.forwardRef<any, any>(function (props: any, ref: any) {
          const modifiedProps = transformInputProps(props);
          return React.createElement(existing, { ...modifiedProps, ref });
        });
        Object.assign(InteropWrapped, existing);
        (InteropWrapped as any).__autoEnglishWrapped = true;
        cssApi.interopComponents.set(OriginalTextInput, InteropWrapped);
        cssApi.interopComponents.set(WrappedTextInput, InteropWrapped);
      }
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
