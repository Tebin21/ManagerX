with open('components/shared/BarcodeScannerModal.tsx', 'r') as f:
    c = f.read()

# 1. Update hook
old_hook = "  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');"
new_hook = """  const currentLang = useLanguageStore((s) => s.language) || 'ku';
  const isAr = currentLang === 'ar';
  const isKuLanguage = currentLang === 'ku';
  const isKuOrAr = isKuLanguage || isAr;"""

c = c.replace(old_hook, new_hook)

# 2. Update feedback strings
c = c.replace(
    "text: isKuLanguage ? `ئەم ئایدییە دووبارەیە: ${rawCode}` : `Duplicate ID: ${rawCode}`,",
    "text: isAr ? `هذا الرمز مكرر: ${rawCode}` : isKuLanguage ? `ئەم ئایدییە دووبارەیە: ${rawCode}` : `Duplicate ID: ${rawCode}`,"
)
c = c.replace(
    "text: isKuLanguage ? `ئەم کۆدە پێشتر زیادکراوە: ${rawCode}` : `Already added: ${rawCode}`,",
    "text: isAr ? `تمت إضافة هذا الرمز مسبقاً: ${rawCode}` : isKuLanguage ? `ئەم کۆدە پێشتر زیادکراوە: ${rawCode}` : `Already added: ${rawCode}`,"
)
c = c.replace(
    "text: isKuLanguage ? `کۆد زیادکرا: ${rawCode}` : `Code added: ${rawCode}`,",
    "text: isAr ? `تمت إضافة الرمز: ${rawCode}` : isKuLanguage ? `کۆد زیادکرا: ${rawCode}` : `Code added: ${rawCode}`,"
)
c = c.replace(
    "? (isKuLanguage ? `زیادکرا: ${itemTitle}` : `Added: ${itemTitle}`)\n            : (isKuLanguage ? `نەدۆزرایەوە: ${rawCode}` : `Not found: ${rawCode}`);",
    "? (isAr ? `تمت الإضافة: ${itemTitle}` : isKuLanguage ? `زیادکرا: ${itemTitle}` : `Added: ${itemTitle}`)\n            : (isAr ? `لم يتم العثور على: ${rawCode}` : isKuLanguage ? `نەدۆزرایەوە: ${rawCode}` : `Not found: ${rawCode}`);"
)
c = c.replace(
    "text: isKuLanguage ? `ئەم ئایدییە دووبارەیە: ${trimmed}` : `Duplicate ID: ${trimmed}`,",
    "text: isAr ? `هذا الرمز مكرر: ${trimmed}` : isKuLanguage ? `ئەم ئایدییە دووبارەیە: ${trimmed}` : `Duplicate ID: ${trimmed}`,"
)
c = c.replace(
    "text: isKuLanguage ? `ئەم کۆدە پێشتر زیادکراوە: ${trimmed}` : `Already added: ${trimmed}`,",
    "text: isAr ? `تمت إضافة هذا الرمز مسبقاً: ${trimmed}` : isKuLanguage ? `ئەم کۆدە پێشتر زیادکراوە: ${trimmed}` : `Already added: ${trimmed}`,"
)
c = c.replace(
    "text: isKuLanguage ? `کۆد زیادکرا: ${trimmed}` : `Code added: ${trimmed}`,",
    "text: isAr ? `تمت إضافة الرمز: ${trimmed}` : isKuLanguage ? `کۆد زیادکرا: ${trimmed}` : `Code added: ${trimmed}`,"
)

# 3. Header titles
c = c.replace(
    """      ? (isKuLanguage ? 'سکانی کۆدەکانی کڕین' : 'Purchase Barcodes Batch')
      : isMultiCartMode
      ? (isKuLanguage ? 'سکانەری فرۆشتنی خێرا' : 'Multi-Item Barcode Scanner')
      : (isKuLanguage ? 'سکانی بارکۆد یان QR' : 'Scan Barcode or QR Code');""",
    """      ? (isAr ? 'مسح باركودات الشراء' : isKuLanguage ? 'سکانی کۆدەکانی کڕین' : 'Purchase Barcodes Batch')
      : isMultiCartMode
      ? (isAr ? 'قارئ باركود البيع السريع' : isKuLanguage ? 'سکانەری فرۆشتنی خێرا' : 'Multi-Item Barcode Scanner')
      : (isAr ? 'مسح الباركود أو رمز QR' : isKuLanguage ? 'سکانی بارکۆد یان QR' : 'Scan Barcode or QR Code');"""
)

# 4. Header subtitles
c = c.replace(
    """      ? (isKuLanguage ? 'کۆدەکان یەک لەدوای یەک سکان بکە بۆ وەسڵ' : 'Scan all item codes sequentially for this purchase')
      : isMultiCartMode
      ? (isKuLanguage ? 'کامێراکە بگرە لەسەر بارکۆدەکان بۆ زیادکردنی ڕاستەوخۆ' : 'Point camera at barcodes to auto-add items to cart')
      : (isKuLanguage ? 'کۆدەکە بخەرە نێو چوارچێوەکە' : 'Align barcode/QR code within the frame');""",
    """      ? (isAr ? 'امسح رموز المواد تِباعاً لهذا الوصل' : isKuLanguage ? 'کۆدەکان یەک لەدوای یەک سکان بکە بۆ وەسڵ' : 'Scan all item codes sequentially for this purchase')
      : isMultiCartMode
      ? (isAr ? 'وجّه الكاميرا نحو الباركود لإضافة المواد تلقائياً' : isKuLanguage ? 'کامێراکە بگرە لەسەر بارکۆدەکان بۆ زیادکردنی ڕاستەوخۆ' : 'Point camera at barcodes to auto-add items to cart')
      : (isAr ? 'ضع الرمز داخل الإطار للمسح' : isKuLanguage ? 'کۆدەکە بخەرە نێو چوارچێوەکە' : 'Align barcode/QR code within the frame');"""
)

# 5. UI elements
c = c.replace(
    "{isKuLanguage ? 'مۆڵەتی کامێرا پێویستە' : 'Camera Permission Required'}",
    "{isAr ? 'مطلوب إذن استخدام الكاميرا' : isKuLanguage ? 'مۆڵەتی کامێرا پێویستە' : 'Camera Permission Required'}"
)
c = c.replace(
    "{isKuLanguage ? 'ڕێگەپێدان بە کامێرا' : 'Grant Permission'}",
    "{isAr ? 'منح الإذن' : isKuLanguage ? 'ڕێگەپێدان بە کامێرا' : 'Grant Permission'}"
)
c = c.replace(
    "{isKuLanguage ? 'داخستن' : 'Cancel'}",
    "{isAr ? 'إلغاء' : isKuLanguage ? 'داخستن' : 'Cancel'}"
)
c = c.replace(
    "{isKuLanguage ? 'کۆدی سکانکراو:' : 'Scanned Code:'}",
    "{isAr ? 'الرمز الممسوح:' : isKuLanguage ? 'کۆدی سکانکراو:' : 'Scanned Code:'}"
)
c = c.replace(
    "{isKuLanguage ? 'سڕینەوە' : 'Delete'}",
    "{isAr ? 'حذف' : isKuLanguage ? 'سڕینەوە' : 'Delete'}"
)
c = c.replace(
    """                      ? (isKuLanguage ? 'سکان بەردەوامە — هەرچەندت دەوێ بیگرە بەرامبەری' : 'Continuous scan — scan multiple barcodes sequentially')
                      : (isKuLanguage ? 'بارکۆدەکە ڕابگرە لە ناو چوارچێوەکەدا' : 'Center barcode inside the frame')}""",
    """                      ? (isAr ? 'مسح مستمر — يمكنك مسح عدة باركودات متتالية' : isKuLanguage ? 'سکان بەردەوامە — هەرچەندت دەوێ بیگرە بەرامبەری' : 'Continuous scan — scan multiple barcodes sequentially')
                      : (isAr ? 'وجّه الباركود داخل الإطار' : isKuLanguage ? 'بارکۆدەکە ڕابگرە لە ناو چوارچێوەکەدا' : 'Center barcode inside the frame')}"""
)
c = c.replace(
    "{isKuLanguage ? 'سڕینەوەی هەمووی' : 'Clear all'}",
    "{isAr ? 'مسح الكل' : isKuLanguage ? 'سڕینەوەی هەمووی' : 'Clear all'}"
)
c = c.replace(
    "{isKuLanguage ? 'دەستی' : 'Manual'}",
    "{isAr ? 'يدوي' : isKuLanguage ? 'دەستی' : 'Manual'}"
)
c = c.replace(
    "{isKuLanguage ? 'کۆدی دەستی' : 'Manual Code'}",
    "{isAr ? 'رمز يدوي' : isKuLanguage ? 'کۆدی دەستی' : 'Manual Code'}"
)
c = c.replace(
    "{isKuLanguage ? 'نووسینی دەستیی کۆد' : 'Type Code Manually'}",
    "{isAr ? 'إدخال الرمز يدوياً' : isKuLanguage ? 'نووسینی دەستیی کۆد' : 'Type Code Manually'}"
)
c = c.replace(
    "{isKuLanguage ? 'نووسینی بارکۆد / کۆدی بەرهەم' : 'Enter Barcode / Item ID'}",
    "{isAr ? 'أدخل الباركود / رمز المادة' : isKuLanguage ? 'نووسینی بارکۆد / کۆدی بەرهەم' : 'Enter Barcode / Item ID'}"
)
c = c.replace(
    "placeholder={isKuLanguage ? 'کۆدەکە بنووسە...' : 'Type code...'}",
    "placeholder={isAr ? 'اكتب الرمز هنا...' : isKuLanguage ? 'کۆدەکە بنووسە...' : 'Type code...'}"
)
c = c.replace(
    "{isKuLanguage ? 'پەشیمانبوونەوە' : 'Cancel'}",
    "{isAr ? 'إلغاء' : isKuLanguage ? 'پەشیمانبوونەوە' : 'Cancel'}"
)
c = c.replace(
    "{isKuLanguage ? 'تەواوە' : 'OK'}",
    "{isAr ? 'موافق' : isKuLanguage ? 'تەواوە' : 'OK'}"
)

with open('components/shared/BarcodeScannerModal.tsx', 'w') as f:
    f.write(c)

print("BarcodeScannerModal updated successfully!")
