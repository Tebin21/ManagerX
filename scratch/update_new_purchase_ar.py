import os

file_path = 'app/(app)/purchases/new-purchase.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = [
    # 1. setIdClearedNotice
    ("""setIdClearedNotice(
          isKuLanguage
            ? `ئایدی (${prevId}) لادرا چونکە ناوی بەرهەمەکە گۆڕدرا و ئەو ئایدیە تایبەتە بە «${prevName}»`
            : `ID (${prevId}) was removed because product name changed (dedicated to "${prevName}")`
        );""",
     """setIdClearedNotice(
          isArLanguage
            ? `تمت إزالة المعرف (${prevId}) لتغيير اسم المنتج (مخصص لـ «${prevName}»)`
            : isKuLanguage
            ? `ئایدی (${prevId}) لادرا چونکە ناوی بەرهەمەکە گۆڕدرا و ئەو ئایدیە تایبەتە بە «${prevName}»`
            : `ID (${prevId}) was removed because product name changed (dedicated to "${prevName}")`
        );"""),

    # 2. Duplicate barcode 1
    ("""Alert.alert(
          isKuLanguage ? 'ئەم ئایدییە دووبارەیە' : 'Duplicate Barcode / ID',
          isKuLanguage
            ? `ئەم بارکۆدە (${cleanCode}) پێشتر بۆ ئایتەمی #${duplicateIdx + 1} دانراوە.\\nبۆ ڕێگری لە هەڵە، تکایە ئایدییەکی جیاواز بۆ ئەم ئایتەمە بەکاربهێنە.`
            : `This barcode (${cleanCode}) is already assigned to Item #${duplicateIdx + 1}.\\nTo prevent errors, please use a unique ID for this item.`
        );""",
     """Alert.alert(
          isArLanguage ? 'هذا المعرف مكرر' : isKuLanguage ? 'ئەم ئایدییە دووبارەیە' : 'Duplicate Barcode / ID',
          isArLanguage
            ? `هذا الباركود (${cleanCode}) مخصص مسبقاً للمادة #${duplicateIdx + 1}.\\nلتجنب الأخطاء، يرجى استخدام معرف فريد لهذه المادة.`
            : isKuLanguage
            ? `ئەم بارکۆدە (${cleanCode}) پێشتر بۆ ئایتەمی #${duplicateIdx + 1} دانراوە.\\nبۆ ڕێگری لە هەڵە، تکایە ئایدییەکی جیاواز بۆ ئەم ئایتەمە بەکاربهێنە.`
            : `This barcode (${cleanCode}) is already assigned to Item #${duplicateIdx + 1}.\\nTo prevent errors, please use a unique ID for this item.`
        );"""),

    # 3. Duplicate barcode 2
    ("""Alert.alert(
          isKuLanguage ? 'ئەم ئایدییە دووبارەیە' : 'Duplicate Barcode / ID',
          isKuLanguage
            ? `ئەم بارکۆدە (${cleanCode}) پێشتر بۆ ئایتەمی #${duplicateIdx + 1} دانراوە.\\nبۆ ڕێگری لە هەڵە، تکایە ئایدییەکی جیاواز بەکاربهێنە.`
            : `This barcode (${cleanCode}) is already assigned to Item #${duplicateIdx + 1}.\\nTo prevent errors, please use a unique ID.`
        );""",
     """Alert.alert(
          isArLanguage ? 'هذا المعرف مكرر' : isKuLanguage ? 'ئەم ئایدییە دووبارەیە' : 'Duplicate Barcode / ID',
          isArLanguage
            ? `هذا الباركود (${cleanCode}) مخصص مسبقاً للمادة #${duplicateIdx + 1}.\\nلتجنب الأخطاء، يرجى استخدام معرف فريد.`
            : isKuLanguage
            ? `ئەم بارکۆدە (${cleanCode}) پێشتر بۆ ئایتەمی #${duplicateIdx + 1} دانراوە.\\nبۆ ڕێگری لە هەڵە، تکایە ئایدییەکی جیاواز بەکاربهێنە.`
            : `This barcode (${cleanCode}) is already assigned to Item #${duplicateIdx + 1}.\\nTo prevent errors, please use a unique ID.`
        );"""),

    # 4. Dedicated alert 1
    ("""Alert.alert(
        isKuLanguage ? 'ئەم ئایدیە تایبەتە بە بەرهەمێکی تر' : 'ID is Dedicated to Another Product',
        isKuLanguage
          ? `ئەم بارکۆدە (${cleanCode}) پێشتر بۆ بەرهەمی «${matchedName}» دیاریکراوە و تایبەتە پێی.\\n\\nناتوانرێت ئەم ئایدیە بۆ بەرهەمی «${productName.trim()}» دابنرێت چونکە ناوی جیاوازە.`
          : `Barcode (${cleanCode}) is already dedicated to "${matchedName}". It cannot be assigned to "${productName.trim()}".`,
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: isKuLanguage ? `بۆ «${matchedName}» بگۆڕە` : `Switch to "${matchedName}"`,
            onPress: () => {""",
     """Alert.alert(
        isArLanguage ? 'هذا المعرف مخصص لمنتج آخر' : isKuLanguage ? 'ئەم ئایدیە تایبەتە بە بەرهەمێکی تر' : 'ID is Dedicated to Another Product',
        isArLanguage
          ? `هذا الباركود (${cleanCode}) مخصص مسبقاً للمنتج «${matchedName}».\\n\\nلا يمكن تخصيص هذا المعرف للمنتج «${productName.trim()}» لاختلاف الاسم.`
          : isKuLanguage
          ? `ئەم بارکۆدە (${cleanCode}) پێشتر بۆ بەرهەمی «${matchedName}» دیاریکراوە و تایبەتە پێی.\\n\\nناتوانرێت ئەم ئایدیە بۆ بەرهەمی «${productName.trim()}» دابنرێت چونکە ناوی جیاوازە.`
          : `Barcode (${cleanCode}) is already dedicated to "${matchedName}". It cannot be assigned to "${productName.trim()}".`,
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: isArLanguage ? `التبديل إلى «${matchedName}»` : isKuLanguage ? `بۆ «${matchedName}» بگۆڕە` : `Switch to "${matchedName}"`,
            onPress: () => {"""),

    # 5. Dedicated alert 2
    ("""Alert.alert(
          isKuLanguage ? 'ئەم ئایدیە تایبەتە بە بەرهەمێکی تر' : 'ID is Dedicated to Another Product',
          isKuLanguage
            ? `ئەم ئایدیە (${cleanCode}) تایبەتە بە بەرهەمی «${matchedName}» و ناتوانرێت بۆ بەرهەمی «${productName.trim()}» بەکاربێت.`
            : `ID (${cleanCode}) is dedicated to "${matchedName}" and cannot be used for "${productName.trim()}".`,
          [
            { text: t('common.cancel'), style: 'cancel', onPress: () => setSharedId('') },
            {
              text: isKuLanguage ? `بۆ «${matchedName}» بگۆڕە` : `Switch to "${matchedName}"`,
              onPress: () => handleSelectSavedItem(matched),
            },
          ]
        );""",
     """Alert.alert(
          isArLanguage ? 'هذا المعرف مخصص لمنتج آخر' : isKuLanguage ? 'ئەم ئایدیە تایبەتە بە بەرهەمێکی تر' : 'ID is Dedicated to Another Product',
          isArLanguage
            ? `هذا المعرف (${cleanCode}) مخصص للمنتج «${matchedName}» ولا يمكن استخدامه للمنتج «${productName.trim()}».`
            : isKuLanguage
            ? `ئەم ئایدیە (${cleanCode}) تایبەتە بە بەرهەمی «${matchedName}» و ناتوانرێت بۆ بەرهەمی «${productName.trim()}» بەکاربێت.`
            : `ID (${cleanCode}) is dedicated to "${matchedName}" and cannot be used for "${productName.trim()}".`,
          [
            { text: t('common.cancel'), style: 'cancel', onPress: () => setSharedId('') },
            {
              text: isArLanguage ? `التبديل إلى «${matchedName}»` : isKuLanguage ? `بۆ «${matchedName}» بگۆڕە` : `Switch to "${matchedName}"`,
              onPress: () => handleSelectSavedItem(matched),
            },
          ]
        );"""),

    # 6. Dedicated inventory conflict
    ("""Alert.alert(
          isKuLanguage ? 'ئەم ئایدیە تایبەتە بە بەرهەمێکی تر' : 'Dedicated ID',
          isKuLanguage
            ? `ئەم ئایدیە (${sharedId.trim()}) پێشتر بۆ بەرهەمی «${conflict.name}» تۆمارکراوە و تایبەتە پێی. ناتوانرێت بۆ بەرهەمی «${productName.trim()}» بەکاربێت.`
            : `ID (${sharedId.trim()}) is dedicated to "${conflict.name}" and cannot be used for "${productName.trim()}".`
        );""",
     """Alert.alert(
          isArLanguage ? 'معرف مخصص لمنتج آخر' : isKuLanguage ? 'ئەم ئایدیە تایبەتە بە بەرهەمێکی تر' : 'Dedicated ID',
          isArLanguage
            ? `هذا المعرف (${sharedId.trim()}) مخصص مسبقاً للمنتج «${conflict.name}» ولا يمكن استخدامه للمنتج «${productName.trim()}».`
            : isKuLanguage
            ? `ئەم ئایدیە (${sharedId.trim()}) پێشتر بۆ بەرهەمی «${conflict.name}» تۆمارکراوە و تایبەتە پێی. ناتوانرێت بۆ بەرهەمی «${productName.trim()}» بەکاربێت.`
            : `ID (${sharedId.trim()}) is dedicated to "${conflict.name}" and cannot be used for "${productName.trim()}".`
        );"""),

    # 7. Duplicate item ID in custom array
    ("""Alert.alert(
            isKuLanguage ? 'ئایدیی دووبارە هەیە' : 'Duplicate Item ID',
            isKuLanguage
              ? `ئایدیی (${customIds[i].trim()}) لە نێوان ئایتەمی #${firstIdx + 1} و ئایتەمی #${i + 1} دووبارەیە.\\nتکایە بۆ ڕێگری لە هەڵە، بۆ هەر ئایتەمێک ئایدییەکی جیاواز دابنێ.`
              : `ID (${customIds[i].trim()}) is duplicated between Item #${firstIdx + 1} and Item #${i + 1}.\\nPlease provide a unique ID for each item.`
          );""",
     """Alert.alert(
            isArLanguage ? 'يوجد معرف مكرر' : isKuLanguage ? 'ئایدیی دووبارە هەیە' : 'Duplicate Item ID',
            isArLanguage
              ? `المعرف (${customIds[i].trim()}) مكرر بين المادة #${firstIdx + 1} والمادة #${i + 1}.\\nيرجى تحديد معرف فريد لكل مادة لتجنب الأخطاء.`
              : isKuLanguage
              ? `ئایدیی (${customIds[i].trim()}) لە نێوان ئایتەمی #${firstIdx + 1} و ئایتەمی #${i + 1} دووبارەیە.\\nتکایە بۆ ڕێگری لە هەڵە، بۆ هەر ئایتەمێک ئایدییەکی جیاواز دابنێ.`
              : `ID (${customIds[i].trim()}) is duplicated between Item #${firstIdx + 1} and Item #${i + 1}.\\nPlease provide a unique ID for each item.`
          );"""),

    # 8. Dedicated ID catch
    ("""Alert.alert(
          isKuLanguage ? 'ئەم ئایدیە تایبەتە بە بەرهەمێکی تر' : 'Dedicated ID',
          isKuLanguage
            ? `ئەم ئایدیە (${idVal}) تایبەتە بە بەرهەمی «${ownerName}» و ناتوانرێت بۆ بەرهەمێکی تری جیاواز بەکاربێت.`
            : `This ID (${idVal}) is dedicated to "${ownerName}" and cannot be used for another product.`
        );""",
     """Alert.alert(
          isArLanguage ? 'معرف مخصص لمنتج آخر' : isKuLanguage ? 'ئەم ئایدیە تایبەتە بە بەرهەمێکی تر' : 'Dedicated ID',
          isArLanguage
            ? `هذا المعرف (${idVal}) مخصص للمنتج «${ownerName}» ولا يمكن استخدامه لمنتج آخر.`
            : isKuLanguage
            ? `ئەم ئایدیە (${idVal}) تایبەتە بە بەرهەمی «${ownerName}» و ناتوانرێت بۆ بەرهەمێکی تری جیاواز بەکاربێت.`
            : `This ID (${idVal}) is dedicated to "${ownerName}" and cannot be used for another product.`
        );"""),

    # 9. Existing stock text
    ("""{isKuLanguage
                    ? `مەوجودی ئێستا: ${existingInventoryProduct.quantity} دانە`
                    : `Stock: ${existingInventoryProduct.quantity} pcs`}""",
     """{isArLanguage
                    ? `المخزون الحالي: ${existingInventoryProduct.quantity} قطعة`
                    : isKuLanguage
                    ? `مەوجودی ئێستا: ${existingInventoryProduct.quantity} دانە`
                    : `Stock: ${existingInventoryProduct.quantity} pcs`}"""),

    # 10. Stock projection text
    ("""{isKuLanguage
                ? `دوای کڕینی ئەم ${qtyNum} دانەیە، کۆی گشتی کۆگا دەبێتە ${(existingInventoryProduct.quantity || 0) + qtyNum} دانە.`
                : `After purchasing ${qtyNum} units, total inventory will be ${(existingInventoryProduct.quantity || 0) + qtyNum} pcs.`}""",
     """{isArLanguage
                ? `بعد شراء هذه الـ ${qtyNum} قطع، سيصبح إجمالي المخزن ${(existingInventoryProduct.quantity || 0) + qtyNum} قطعة.`
                : isKuLanguage
                ? `دوای کڕینی ئەم ${qtyNum} دانەیە، کۆی گشتی کۆگا دەبێتە ${(existingInventoryProduct.quantity || 0) + qtyNum} دانە.`
                : `After purchasing ${qtyNum} units, total inventory will be ${(existingInventoryProduct.quantity || 0) + qtyNum} pcs.`}"""),

    # 11. Bound ID text
    ("""{isKuLanguage
                  ? `ئەم ئایدیە گرێدراوە و تایبەتە بە «${boundProductIdentity?.name ?? ''}»`
                  : `This ID is dedicated and bound to "${boundProductIdentity?.name ?? ''}"`}""",
     """{isArLanguage
                  ? `هذا المعرف مرتبط ومخصص لـ «${boundProductIdentity?.name ?? ''}»`
                  : isKuLanguage
                  ? `ئەم ئایدیە گرێدراوە و تایبەتە بە «${boundProductIdentity?.name ?? ''}»`
                  : `This ID is dedicated and bound to "${boundProductIdentity?.name ?? ''}"`}"""),

    # 12. Custom IDs title
    ("""{isKuLanguage ? `ئایدیی تایبەت بۆ هەر ئایتەمێک (${qtyNum} دانە)` : `Custom Item IDs (${qtyNum})`}""",
     """{isArLanguage ? `معرف خاص لكل قطعة (${qtyNum} قطع)` : isKuLanguage ? `ئایدیی تایبەت بۆ هەر ئایتەمێک (${qtyNum} دانە)` : `Custom Item IDs (${qtyNum})`}"""),

    # 13. Custom item #${i + 1}
    ("""{isKuLanguage ? `ئایتەمی #${i + 1}` : `Item #${i + 1}`}""",
     """{isArLanguage ? `المادة #${i + 1}` : isKuLanguage ? `ئایتەمی #${i + 1}` : `Item #${i + 1}`}"""),

    # 14. Custom item barcode #${i + 1}
    ("""{isKuLanguage ? `کۆد یان بارکۆدی ئایتەمی ${i + 1}` : `Barcode / ID for item ${i + 1}`}""",
     """{isArLanguage ? `رمز أو باركود المادة ${i + 1}` : isKuLanguage ? `کۆد یان بارکۆدی ئایتەمی ${i + 1}` : `Barcode / ID for item ${i + 1}`}"""),

    # 15. Scanner modal
    ("""title={isKuLanguage ? 'سکانی بارکۆدی کاڵا' : 'Scan Product Barcode'}
        subtitle={
          targetCustomIdx !== null
            ? (isKuLanguage ? `کۆد بۆ ئایتەمی #${targetCustomIdx + 1} سکان بکە` : `Scan barcode for item #${targetCustomIdx + 1}`)
            : (isKuLanguage ? 'کۆدەکان یەک لەدوای یەک سکان بکە بۆ وەسڵی کڕین' : 'Scan item codes sequentially for this purchase')
        }""",
     """title={isArLanguage ? 'مسح باركود المادة' : isKuLanguage ? 'سکانی بارکۆدی کاڵا' : 'Scan Product Barcode'}
        subtitle={
          targetCustomIdx !== null
            ? (isArLanguage ? `امسح الرمز للمادة #${targetCustomIdx + 1}` : isKuLanguage ? `کۆد بۆ ئایتەمی #${targetCustomIdx + 1} سکان بکە` : `Scan barcode for item #${targetCustomIdx + 1}`)
            : (isArLanguage ? 'امسح الرموز بالتسلسل لفاتورة الشراء هذه' : isKuLanguage ? 'کۆدەکان یەک لەدوای یەک سکان بکە بۆ وەسڵی کڕین' : 'Scan item codes sequentially for this purchase')
        }"""),
]

applied = 0
for target, repl in replacements:
    if target in content:
        content = content.replace(target, repl)
        applied += 1
    else:
        print("TARGET NOT FOUND:", repr(target[:50]))

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Applied {applied}/{len(replacements)} replacements.")

