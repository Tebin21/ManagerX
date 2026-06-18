export interface ThemePreset {
  key: string;
  name: string;
  primary: string;
}

export const DEFAULT_ACCENT = '#3B82F6';
export const DEFAULT_THEME_KEY = 'default';

export const THEME_PRESETS: ThemePreset[] = [
  { key: 'default',  name: 'Default Blue',  primary: '#3B82F6' },
  { key: 'navy',     name: 'Navy Blue',     primary: '#254C9B' },
  { key: 'purple',   name: 'Soft Purple',   primary: '#7C5CE1' },
  { key: 'emerald',  name: 'Emerald',       primary: '#0A9272' },
  { key: 'orange',   name: 'Amber',         primary: '#D97706' },
  { key: 'graphite', name: 'Graphite',      primary: '#4D6685' },
  { key: 'deepGray', name: 'Deep Gray',     primary: '#526070' },
  { key: 'red',      name: 'Elegant Red',   primary: '#BF3030' },
  { key: 'teal',     name: 'Teal',          primary: '#0E7C79' },
  { key: 'midnight', name: 'Midnight',      primary: '#2C3E6B' },
];
