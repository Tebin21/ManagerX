with open('app/(app)/debt/index.tsx', 'r') as f:
    c = f.read()

# 1. Update isKuLanguage hook to include isAr
c = c.replace(
    "  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');",
    "  const currentLang = useLanguageStore((s) => s.language) || 'ku';\n  const isAr = currentLang === 'ar';\n  const isKuLanguage = currentLang === 'ku';"
)

# 2. Batch strings
c = c.replace(
    "{debt.productName} • {isKuLanguage ? `وەجبەی ${debt.batchNumber || 1}` : `Batch #${debt.batchNumber || 1}`}",
    "{debt.productName} • {isAr ? `الوجبة ${debt.batchNumber || 1}` : isKuLanguage ? `وەجبەی ${debt.batchNumber || 1}` : `Batch #${debt.batchNumber || 1}`}"
)
c = c.replace(
    "{debt.batchQuantity ? ` (${debt.batchQuantity} ${isKuLanguage ? 'دانە' : 'pcs'})` : ''}",
    "{debt.batchQuantity ? ` (${debt.batchQuantity} ${isAr ? 'قطعة' : isKuLanguage ? 'دانە' : 'pcs'})` : ''}"
)
c = c.replace(
    "{debt.totalBatches && debt.totalBatches > 1 ? ` · ${isKuLanguage ? `لە کۆی ${debt.totalBatches} وەجبە` : `of ${debt.totalBatches}`}` : ''}",
    "{debt.totalBatches && debt.totalBatches > 1 ? ` · ${isAr ? `من إجمالي ${debt.totalBatches} وجبات` : isKuLanguage ? `لە کۆی ${debt.totalBatches} وەجبە` : `of ${debt.totalBatches}`}` : ''}"
)
c = c.replace(
    "{isKuLanguage ? 'تەواوی بڕ' : 'Full'}",
    "{isAr ? 'كامل المبلغ' : isKuLanguage ? 'تەواوی بڕ' : 'Full'}"
)

# 3. Period helper
c = c.replace(
    "if (periodKey === 'all') return isKuLanguage ? 'هەمووی' : 'All Time';",
    "if (periodKey === 'all') return isAr ? 'الكل' : isKuLanguage ? 'هەمووی' : 'All Time';"
)
c = c.replace(
    "if (periodKey === 'today') return isKuLanguage ? 'ئەمڕۆ' : 'Today';",
    "if (periodKey === 'today') return isAr ? 'اليوم' : isKuLanguage ? 'ئەمڕۆ' : 'Today';"
)
c = c.replace(
    "if (periodKey === 'week') return isKuLanguage ? 'ئەم هەفتەیە' : 'This Week';",
    "if (periodKey === 'week') return isAr ? 'هذا الأسبوع' : isKuLanguage ? 'ئەم هەفتەیە' : 'This Week';"
)
c = c.replace(
    "if (periodKey === 'month') return isKuLanguage ? 'ئەم مانگە' : 'This Month';",
    "if (periodKey === 'month') return isAr ? 'هذا الشهر' : isKuLanguage ? 'ئەم مانگە' : 'This Month';"
)
c = c.replace(
    "if (periodKey === 'year') return isKuLanguage ? 'ئەمساڵ' : 'This Year';",
    "if (periodKey === 'year') return isAr ? 'هذه السنة' : isKuLanguage ? 'ئەمساڵ' : 'This Year';"
)
c = c.replace(
    "return isKuLanguage ? 'دیاریکراو' : 'Custom';",
    "return isAr ? 'مخصص' : isKuLanguage ? 'دیاریکراو' : 'Custom';"
)

# 4. Debt settled alert
c = c.replace(
    "isKuLanguage ? 'تەواوبوونی قەرز' : 'Debt Settled',",
    "isAr ? 'تسوية الدين' : isKuLanguage ? 'تەواوبوونی قەرز' : 'Debt Settled',"
)
c = c.replace(
    "text: isKuLanguage ? 'نەخێر / گەڕانەوە' : 'No / Return',",
    "text: isAr ? 'لا / رجوع' : isKuLanguage ? 'نەخێر / گەڕانەوە' : 'No / Return',"
)
c = c.replace(
    "text: isKuLanguage ? 'پرینتکردنی وەسڵ' : 'Print Receipt',",
    "text: isAr ? 'طباعة الوصل' : isKuLanguage ? 'پرینتکردنی وەسڵ' : 'Print Receipt',"
)
c = c.replace(
    "Alert.alert(isKuLanguage ? 'هەڵە' : 'Error', String(err));",
    "Alert.alert(isAr ? 'خطأ' : isKuLanguage ? 'هەڵە' : 'Error', String(err));"
)

# 5. Period labels
c = c.replace(
    "today:  isKuLanguage ? 'ئەمڕۆ' : t('periodFilter.today'),",
    "today:  isAr ? 'اليوم' : isKuLanguage ? 'ئەمڕۆ' : t('periodFilter.today'),"
)
c = c.replace(
    "week:   isKuLanguage ? 'ئەم هەفتەیە' : t('periodFilter.thisWeek'),",
    "week:   isAr ? 'هذا الأسبوع' : isKuLanguage ? 'ئەم هەفتەیە' : t('periodFilter.thisWeek'),"
)
c = c.replace(
    "month:  isKuLanguage ? 'ئەم مانگە' : t('periodFilter.thisMonth'),",
    "month:  isAr ? 'هذا الشهر' : isKuLanguage ? 'ئەم مانگە' : t('periodFilter.thisMonth'),"
)
c = c.replace(
    "year:   isKuLanguage ? 'ئەمساڵ' : t('periodFilter.thisYear'),",
    "year:   isAr ? 'هذه السنة' : isKuLanguage ? 'ئەمساڵ' : t('periodFilter.thisYear'),"
)
c = c.replace(
    "all:    isKuLanguage ? 'هەمووی' : 'All',",
    "all:    isAr ? 'الكل' : isKuLanguage ? 'هەمووی' : 'All',"
)
c = c.replace(
    "custom: isKuLanguage ? 'دیاریکراو' : t('periodFilter.customRange'),",
    "custom: isAr ? 'مخصص' : isKuLanguage ? 'دیاریکراو' : t('periodFilter.customRange'),"
)

# 6. Favor texts
c = c.replace(
    """    ? (isKuLanguage ? 'باڵانس لە قازانجی ئێمەیە (کڕیاران زیاتر قەرزدارن)' : 'In Our Favor (Customers owe us more)')
    : (isKuLanguage ? 'باڵانس لە بەرژەوەندی دابینکەرانە (دەبێت زیاتر بدەین)' : 'In Suppliers Favor (We owe suppliers more)');""",
    """    ? (isAr ? 'الرصيد لصالحنا (الزبائن مدينون أكثر)' : isKuLanguage ? 'باڵانس لە قازانجی ئێمەیە (کڕیاران زیاتر قەرزدارن)' : 'In Our Favor (Customers owe us more)')
    : (isAr ? 'الرصيد لصالح الموردين (علينا التزامات أكثر)' : isKuLanguage ? 'باڵانس لە بەرژەوەندی دابینکەرانە (دەبێت زیاتر بدەین)' : 'In Suppliers Favor (We owe suppliers more)');"""
)

# 7. Subtitles
c = c.replace(
    "subtitle={isKuLanguage ? 'قەرزی کڕیاران' : 'Receivables'}",
    "subtitle={isAr ? 'ديون الزبائن' : isKuLanguage ? 'قەرزی کڕیاران' : 'Receivables'}"
)
c = c.replace(
    "subtitle={isKuLanguage ? 'قەرزی دابینکەران' : 'Payables'}",
    "subtitle={isAr ? 'ديون الموردين' : isKuLanguage ? 'قەرزی دابینکەران' : 'Payables'}"
)
c = c.replace(
    "subtitle={reportOverdueCount > 0 ? (isKuLanguage ? 'دواکەوتوو' : 'Overdue') : (isKuLanguage ? 'ئاسایی' : 'Normal')}",
    "subtitle={reportOverdueCount > 0 ? (isAr ? 'متأخر' : isKuLanguage ? 'دواکەوتوو' : 'Overdue') : (isAr ? 'طبيعي' : isKuLanguage ? 'ئاسایی' : 'Normal')}"
)
c = c.replace(
    "title={isKuLanguage ? 'کۆی بڕی قەرزەکان' : 'Total Debts'}",
    "title={isAr ? 'إجمالي الديون' : isKuLanguage ? 'کۆی بڕی قەرزەکان' : 'Total Debts'}"
)
c = c.replace(
    "subtitle={isKuLanguage ? 'قەرزە چالاکەکان' : 'Active Debts'}",
    "subtitle={isAr ? 'الديون النشطة' : isKuLanguage ? 'قەرزە چالاکەکان' : 'Active Debts'}"
)
c = c.replace(
    "{isKuLanguage ? 'باڵانسی پوختەی قەرزەکان' : 'Net Debt Balance'}",
    "{isAr ? 'صافي رصيد الديون' : isKuLanguage ? 'باڵانسی پوختەی قەرزەکان' : 'Net Debt Balance'}"
)
c = c.replace(
    "{isKuLanguage ? 'قەرزی کڕیاران' : 'Customer Debts'}",
    "{isAr ? 'ديون الزبائن' : isKuLanguage ? 'قەرزی کڕیاران' : 'Customer Debts'}"
)
c = c.replace(
    "{isKuLanguage ? 'قەرزی دابینکەران' : 'Supplier Debts'}",
    "{isAr ? 'ديون الموردين' : isKuLanguage ? 'قەرزی دابینکەران' : 'Supplier Debts'}"
)
c = c.replace(
    "{isKuLanguage ? 'بینینی هەمووی' : 'View All'}",
    "{isAr ? 'عرض الكل' : isKuLanguage ? 'بینینی هەمووی' : 'View All'}"
)
c = c.replace(
    "{periodDisplayLabel}{query ? ` (${isKuLanguage ? 'گەڕان' : 'Search'})` : ''}:",
    "{periodDisplayLabel}{query ? ` (${isAr ? 'بحث' : isKuLanguage ? 'گەڕان' : 'Search'})` : ''}:"
)
c = c.replace(
    "{isKuLanguage ? 'کۆی ماوە:' : 'Total Remaining:'}",
    "{isAr ? 'المجموع المتبقي:' : isKuLanguage ? 'کۆی ماوە:' : 'Total Remaining:'}"
)

with open('app/(app)/debt/index.tsx', 'w') as f:
    f.write(c)

print("Debt index screen updated successfully!")
