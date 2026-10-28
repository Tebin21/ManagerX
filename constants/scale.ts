export interface ScaleLevelInfo {
  level: number;
  factor: number;
  percent: number;
  labelKu: string;
  labelEn: string;
  subKu: string;
  subEn: string;
}

export const APP_SCALE_LEVELS: ScaleLevelInfo[] = [
  { level: 1,  factor: 0.78, percent: 78,  labelKu: 'زۆر زۆر بچووک', labelEn: 'XX-Small', subKu: 'بۆ بینینی چڕی بەرز و شاشەی زۆر بچووک', subEn: 'High density view' },
  { level: 2,  factor: 0.84, percent: 84,  labelKu: 'زۆر بچووک',     labelEn: 'Extra Small', subKu: 'کۆمپێکت و بچووککراوە', subEn: 'Compact & small' },
  { level: 3,  factor: 0.90, percent: 90,  labelKu: 'بچووک',         labelEn: 'Small', subKu: 'بۆ مۆبایلی بچووک و دیمەنی ورد', subEn: 'For smaller screens' },
  { level: 4,  factor: 0.95, percent: 95,  labelKu: 'پوخت / مامناوەند بچووک', labelEn: 'Slightly Small', subKu: 'کەمێک وردتر لە بنەڕەتی', subEn: 'Slightly compact' },
  { level: 5,  factor: 1.00, percent: 100, labelKu: 'ئاسایی (ستاندارد)', labelEn: 'Default (Normal)', subKu: 'قەبارەی بنەڕەتی و پێشوەڕووی فرۆشیار', subEn: 'Original system size' },
  { level: 6,  factor: 1.06, percent: 106, labelKu: 'کەمێک گەورە',    labelEn: 'Slightly Large', subKu: 'بۆ ئاسوودەیی خوێندنەوە و تێکستی ڕوون', subEn: 'Easy reading' },
  { level: 7,  factor: 1.12, percent: 112, labelKu: 'مامناوەند گەورە', labelEn: 'Medium Large', subKu: 'بۆ تابلێت و ئایپاد و پەنجەلێدان', subEn: 'Great for tablets' },
  { level: 8,  factor: 1.18, percent: 118, labelKu: 'گەورە',          labelEn: 'Large', subKu: 'دوگمە و تێکستی دیار و گەورەتر', subEn: 'Prominent buttons & text' },
  { level: 9,  factor: 1.25, percent: 125, labelKu: 'زۆر گەورە',      labelEn: 'Extra Large', subKu: 'گونجاو بۆ ئایپادی گەورە (11-13")', subEn: 'Ideal for 11-13" iPads' },
  { level: 10, factor: 1.35, percent: 135, labelKu: 'ماکسیمەم (باڵا)', labelEn: 'Maximum Jumbo', subKu: 'گەورەترین قەبارەی گشتی بەشەکان', subEn: 'Maximum touch & visibility' },
];

export const DEFAULT_SCALE_LEVEL = 5;

export function getScaleInfo(level: number): ScaleLevelInfo {
  const safeLevel = Math.max(1, Math.min(10, Math.round(level || DEFAULT_SCALE_LEVEL)));
  return APP_SCALE_LEVELS.find((s) => s.level === safeLevel) ?? APP_SCALE_LEVELS[4];
}

export function getScaleFactor(level: number): number {
  return getScaleInfo(level).factor;
}

