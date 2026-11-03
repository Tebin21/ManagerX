import React from 'react';
import * as ReactNative from 'react-native';
import { toEnglishDigits } from '@/utils/formatters';

let isInstalled = false;
let isAuthScreenActive = false;

export function setAuthScreenActive(active: boolean): void {
  isAuthScreenActive = active;
}

export function getAuthScreenActive(): boolean {
  return isAuthScreenActive;
}

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

export function transformInputProps(props: any): any {
  if (!props) return props;
  const isAuthField =
    isAuthScreenActive ||
    props.isAuthScreen ||
    props.secureTextEntry ||
    props.skipEnglishDigitsConversion;
  if (isAuthField) return props;

  const modified = { ...props };
  if (typeof modified.value === 'string') {
    modified.value = toEnglishDigits(modified.value);
  }
  if (typeof modified.defaultValue === 'string') {
    modified.defaultValue = toEnglishDigits(modified.defaultValue);
  }

  const origOnChangeText = props.onChangeText;
  if (origOnChangeText) {
    modified.onChangeText = (text: string) => {
      const converted = toEnglishDigits(text);
      origOnChangeText(converted);
    };
  }
  return modified;
}

export function installAutoEnglishDigits(): void {
  if (isInstalled) return;
  isInstalled = true;

  // On Web & Desktop DOM, attach an input event listener
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      document.addEventListener(
        'input',
        (e: any) => {
          if (isAuthScreenActive) return;
          const target = e.target;
          if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
            if (target.type === 'password') return;
            const val = target.value;
            if (typeof val === 'string' && /[٠-٩۰-۹]/.test(val)) {
              const converted = toEnglishDigits(val);
              target.value = converted;
            }
          }
        },
        true
      );
    } catch {}
  }
}
