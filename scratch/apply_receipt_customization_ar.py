import json, re

with open('scratch/build_ar_receipt_updater.py') as f:
    scope = {}
    exec(f.read(), scope)
    ar_map = scope['ar_map']

with open('app/(app)/settings/receipt-customization.tsx', 'r') as f:
    content = f.read()

# 1. Update PaperOption interface and PAPER_OPTIONS
old_paper_interface = """interface PaperOption {
  id: ReceiptPaperSize;
  label: string;
  widthCm: string;
  desc: string;
  descEn: string;
}"""

new_paper_interface = """interface PaperOption {
  id: ReceiptPaperSize;
  label: string;
  widthCm: string;
  desc: string;
  descAr: string;
  descEn: string;
}"""

content = content.replace(old_paper_interface, new_paper_interface)

old_paper_options = """const PAPER_OPTIONS: PaperOption[] = [
  { id: '58mm', label: '58mm', widthCm: '5.8 cm', desc: 'وەصڵی بچووک (Mobile POS)', descEn: 'Mobile POS (58mm)' },
  { id: '80mm', label: '80mm', widthCm: '8.0 cm', desc: 'ستاندارد (Desktop POS)', descEn: 'Desktop POS (80mm)' },
  { id: '110mm', label: '110mm', widthCm: '11.0 cm', desc: 'وەصڵی پان (Wide Thermal)', descEn: 'Wide Thermal (110mm)' },
  { id: 'A4', label: 'A4 Sheet', widthCm: '21 × 29.7 cm', desc: 'پەڕەی فەرمی (Standard A4)', descEn: 'Standard A4 Sheet' },
];"""

new_paper_options = """const PAPER_OPTIONS: PaperOption[] = [
  { id: '58mm', label: '58mm', widthCm: '5.8 cm', desc: 'وەصڵی بچووک (Mobile POS)', descAr: 'وصل صغير (Mobile POS)', descEn: 'Mobile POS (58mm)' },
  { id: '80mm', label: '80mm', widthCm: '8.0 cm', desc: 'ستاندارد (Desktop POS)', descAr: 'قياسي (Desktop POS)', descEn: 'Desktop POS (80mm)' },
  { id: '110mm', label: '110mm', widthCm: '11.0 cm', desc: 'وەصڵی پان (Wide Thermal)', descAr: 'وصل عريض (Wide Thermal)', descEn: 'Wide Thermal (110mm)' },
  { id: 'A4', label: 'A4 Sheet', widthCm: '21 × 29.7 cm', desc: 'پەڕەی فەرمی (Standard A4)', descAr: 'ورقة رسمية (Standard A4)', descEn: 'Standard A4 Sheet' },
];"""

content = content.replace(old_paper_options, new_paper_options)

# 2. Update language hook in ReceiptCustomizationScreen
old_lang_line = "  const isKurdish = useLanguageStore((s) => s.language === 'ku');"
new_lang_line = """  const currentLang = useLanguageStore((s) => s.language) || 'ku';
  const isAr = currentLang === 'ar';
  const isKurdish = currentLang === 'ku';
  const isKuOrAr = isKurdish || isAr;"""

content = content.replace(old_lang_line, new_lang_line)

# 3. Update opt.desc rendering
content = content.replace("{isKurdish ? opt.desc : opt.descEn}", "{isAr ? opt.descAr : isKurdish ? opt.desc : opt.descEn}")

# 4. Update font family check
content = content.replace("isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }", "isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }")
content = content.replace("isKurdish && { fontFamily: SETTINGS_KURDISH_FONT }", "isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT }")

# 5. Update Alert dialog in handleResetModule
old_alert = """    Alert.alert(
      isKurdish ? 'گەڕاندنەوەی سەرەتایی' : 'Reset to Defaults',
      isKurdish
        ? `ئایا دڵنیایت لە گەڕاندنەوەی سەرەتایی ڕێکخستنەکانی چاپی بەشی (${activeTabLabel}) بۆ باری سەرەتایی؟`
        : `Are you sure you want to reset all receipt customization options for (${activeTabLabel}) to their defaults?`,
      [
        { text: isKurdish ? 'پاشگەزبوونەوە' : 'Cancel', style: 'cancel' },
        {
          text: isKurdish ? 'بەڵێ، بگەڕێنەوە' : 'Reset',"""

new_alert = """    Alert.alert(
      isAr ? 'استعادة الإعدادات الافتراضية' : isKurdish ? 'گەڕاندنەوەی سەرەتایی' : 'Reset to Defaults',
      isAr
        ? `هل أنت متأكد من استعادة كافة إعدادات طباعة (${activeTabLabel}) إلى وضعها الافتراضي؟`
        : isKurdish
        ? `ئایا دڵنیایت لە گەڕاندنەوەی سەرەتایی ڕێکخستنەکانی چاپی بەشی (${activeTabLabel}) بۆ باری سەرەتایی؟`
        : `Are you sure you want to reset all receipt customization options for (${activeTabLabel}) to their defaults?`,
      [
        { text: isAr ? 'إلغاء' : isKurdish ? 'پاشگەزبوونەوە' : 'Cancel', style: 'cancel' },
        {
          text: isAr ? 'نعم، استعادة' : isKurdish ? 'بەڵێ، بگەڕێنەوە' : 'Reset',"""

content = content.replace(old_alert, new_alert)

# 6. Replace all isKurdish ? 'ku' : 'en' with isAr ? 'ar' : isKurdish ? 'ku' : 'en'
replacements_count = 0
for (ku, en), ar in ar_map.items():
    # Escape quotes for JS string literals
    safe_ar = ar.replace("'", "\\'")
    
    # Check for single-quote pattern: isKurdish ? 'ku' : 'en'
    pattern_sq = f"isKurdish ? '{ku}' : '{en}'"
    replacement_sq = f"isAr ? '{safe_ar}' : isKurdish ? '{ku}' : '{en}'"
    if pattern_sq in content:
        content = content.replace(pattern_sq, replacement_sq)
        replacements_count += 1
        
    # Check for double-quote pattern
    pattern_dq = f'isKurdish ? "{ku}" : "{en}"'
    replacement_dq = f'isAr ? "{safe_ar}" : isKurdish ? "{ku}" : "{en}"'
    if pattern_dq in content:
        content = content.replace(pattern_dq, replacement_dq)
        replacements_count += 1

print(f"Direct replacements made: {replacements_count}")

with open('app/(app)/settings/receipt-customization.tsx', 'w') as f:
    f.write(content)

print("Updated app/(app)/settings/receipt-customization.tsx successfully!")
