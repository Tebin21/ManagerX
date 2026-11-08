import React from 'react';

export type StoreLocale = 'ku' | 'ar' | 'en';

export interface StoreTranslations {
  activeStore: string;
  cart: string;
  cartCountSuffix: string;
  cartEmpty: string;
  cartEmptySubtitle: string;
  returnToShopping: string;
  selectProductPrompt: string;
  searchPlaceholder: string;
  searchTitle: string;
  clearSearch: string;
  allCategories: string;
  addToCart: string;
  inCart: string;
  outOfStock: string;
  maxStockReached: string;
  unit: string;
  total: string;
  totalItems: string;
  totalPrice: string;
  clearCart: string;
  checkout: string;
  sendWhatsApp: string;
  generateA4Invoice: string;
  customerInfoTitle: string;
  customerNamePlaceholder: string;
  customerPhonePlaceholder: string;
  customerAddressPlaceholder: string;
  customerNotesPlaceholder: string;
  storeInactive: string;
  storeInactiveSubtitle: string;
  storeInactiveContact: string;
  noProductsFound: string;
  noProductsMatched: string;
  contactAndAddress: string;
  allRightsReserved: string;
  poweredBy: string;
  // A4 Invoice labels:
  a4Title: string;
  a4Subtitle: string;
  a4PrintPdf: string;
  a4Close: string;
  a4StoreInvoice: string;
  a4InvoiceNo: string;
  a4Date: string;
  a4Time: string;
  a4CustomerDelivery: string;
  a4CustomerName: string;
  a4CustomerPhone: string;
  a4DeliveryAddress: string;
  a4CustomerNotes: string;
  a4ColItemName: string;
  a4ColQty: string;
  a4ColUnitPrice: string;
  a4ColSubtotal: string;
  a4TotalUnits: string;
  a4GrandTotal: string;
  a4ThankYou: string;
  a4GeneratedBy: string;
  // WhatsApp Message template
  whatsappGreeting: string;
  whatsappCustomerDetails: string;
  whatsappName: string;
  whatsappPhone: string;
  whatsappAddress: string;
  whatsappNotes: string;
  whatsappItemsList: string;
  whatsappQty: string;
  whatsappTotalItems: string;
  whatsappTotalPrice: string;
  whatsappOrderTime: string;
  whatsappThanks: string;
  unspecified: string;
  page: string;
  ofPages: string;
  previousPage: string;
  nextPage: string;
  showingItems: string;
}

export const STORE_TRANSLATIONS: Record<StoreLocale, StoreTranslations> = {
  ku: {
    activeStore: 'فڕۆشگا چالاکە',
    cart: 'سەبەتەی کڕین',
    cartCountSuffix: 'کاڵا هەڵبژێردراوە',
    cartEmpty: 'سەبەتەکەت بەتاڵە!',
    cartEmptySubtitle: 'هێشتا هیچ کاڵایەکت زیاد نەکردووە. لە لیستی کاڵاکان بە خواستی خۆت کاڵا هەڵبژێرە و زیادی بکە بۆ سەبەتە.',
    returnToShopping: 'گەڕانەوە بۆ کڕین',
    selectProductPrompt: 'سەبەتە بەتاڵە',
    searchPlaceholder: 'گەڕان بۆ کاڵاکان...',
    searchTitle: 'گەڕان بۆ کاڵاکان',
    clearSearch: 'سڕینەوەی گەڕان',
    allCategories: 'هەمووی',
    addToCart: 'زیادکردن بۆ سەبەتە',
    inCart: 'لە سەبەتەدایە',
    outOfStock: 'لە کۆگادا نەماوە',
    maxStockReached: 'تەنها تا {count} دانە دەتوانیت داوا بکەیت، لە کۆگادا نەماوە',
    unit: 'دانە',
    total: 'کۆی گشتی',
    totalItems: 'کۆی گشتی کاڵاکان',
    totalPrice: 'کۆی گشتی بڕی پارە',
    clearCart: 'سڕینەوەی هەمووی',
    checkout: 'تەواوکردنی کڕین',
    sendWhatsApp: 'ناردنی داواکاری بۆ واتسئەپ',
    generateA4Invoice: 'دروستکردنی وەسڵی A4 (سادە و جوان)',
    customerInfoTitle: 'زانیاری کڕیار بۆ پەیوەندی و گەیاندن (ئارەزوومەندانە):',
    customerNamePlaceholder: '١. ناوی کڕیار...',
    customerPhonePlaceholder: '٢. ژمارەی مۆبایل...',
    customerAddressPlaceholder: '٣. ناونیشانی تەواوی گەیاندن...',
    customerNotesPlaceholder: '٤. داواکاری ئیختیاری یان تێبینی تایبەت...',
    storeInactive: 'ئەم فڕۆشگایە بۆ ماوەیەکی کاتی ناچالاک کراوە',
    storeInactiveSubtitle: 'خاوەنی فڕۆشگاکە لە ئێستادا پێشاندانی کاڵاکانی ڕاگرتووە. تکایە دواتر سەردان بکەرەوە.',
    storeInactiveContact: 'بۆ پەیوەندیکردن، دەتوانیت پەیوەندی بە ژمارەی فڕۆشگاکە بکەیت لە خوارەوە.',
    noProductsFound: 'هیچ کاڵایەک لەم فڕۆشگایە دانەنراوە.',
    noProductsMatched: 'هیچ کاڵایەک نەدۆزرایەوە کە لەگەڵ گەڕانەکەت بگونجێت.',
    contactAndAddress: 'پەیوەندیکردن و ناونیشان',
    allRightsReserved: 'مافی لەبەرگرتنەوە پارێزراوە',
    poweredBy: 'دروستکراوە لە ڕێگەی فرۆشیار',
    a4Title: 'وەسڵی فەرمی داواکاری (A4)',
    a4Subtitle: 'ئامادەکراوە بۆ چاپکردن، داگرتن وەک PDF، یان هاوبەشکردن',
    a4PrintPdf: 'چاپکردن / PDF',
    a4Close: 'داخستن',
    a4StoreInvoice: 'وەسڵی داواکاری وێبستۆر',
    a4InvoiceNo: 'ژمارەی وەسڵ',
    a4Date: 'بەروار',
    a4Time: 'کات',
    a4CustomerDelivery: 'زانیاری کڕیار و گەیاندن',
    a4CustomerName: 'ناوی کڕیار',
    a4CustomerPhone: 'ژمارەی مۆبایل',
    a4DeliveryAddress: 'ناونیشانی گەیاندن',
    a4CustomerNotes: 'داواکاری ئیختیاری / تێبینی تایبەت',
    a4ColItemName: 'ناوی کاڵا',
    a4ColQty: 'بڕ',
    a4ColUnitPrice: 'نرخی تاک',
    a4ColSubtotal: 'کۆی نرخ',
    a4TotalUnits: 'کۆی گشتی ژمارەی کاڵاکان',
    a4GrandTotal: 'کۆی گشتی بڕی پارە',
    a4ThankYou: 'سوپاس بۆ کڕینەکەت لە',
    a4GeneratedBy: 'ئەم بەڵگەنامەیە بە شێوەی خۆکار لە ڕێگەی وێبستۆری فرۆشیار دروستکراوە.',
    whatsappGreeting: 'سڵاو، لە وێبستۆری {store} ئەم کاڵایانەم بینی و داواکاریم هەیە لەسەریان:',
    whatsappCustomerDetails: 'زانیاری کڕیار:',
    whatsappName: 'ناوی کڕیار',
    whatsappPhone: 'ژمارەی مۆبایل',
    whatsappAddress: 'ناونیشان',
    whatsappNotes: 'داواکاری ئیختیاری / تێبینی',
    whatsappItemsList: 'لیستی کاڵاکان:',
    whatsappQty: 'بڕ',
    whatsappTotalItems: 'کۆی گشتی کاڵاکان',
    whatsappTotalPrice: 'کۆی گشتی بڕی پارە',
    whatsappOrderTime: 'کاتی داواکاری',
    whatsappThanks: 'سوپاس',
    unspecified: 'دیاری نەکراوە',
    page: 'لاپەڕە',
    ofPages: 'لە',
    previousPage: 'پێشوو',
    nextPage: 'دواتر',
    showingItems: 'پیشاندانی {start} - {end} لە کۆی {total} کاڵا',
  },
  ar: {
    activeStore: 'المتجر نشط ومتاح',
    cart: 'سلة المشتريات',
    cartCountSuffix: 'منتج محدد',
    cartEmpty: 'سلتك فارغة حالياً!',
    cartEmptySubtitle: 'لم تقم بإضافة أي منتج بعد. تصفح المنتجات في المتجر وأضف ما يعجبك إلى السلة.',
    returnToShopping: 'متابعة التسوق',
    selectProductPrompt: 'السلة فارغة',
    searchPlaceholder: 'البحث عن المنتجات...',
    searchTitle: 'البحث عن المنتجات',
    clearSearch: 'مسح البحث',
    allCategories: 'الكل',
    addToCart: 'إضافة إلى السلة',
    inCart: 'موجود في السلة',
    outOfStock: 'نفد من المخزون',
    maxStockReached: 'الحد الأقصى المتاح للطلب هو {count} قطع فقط',
    unit: 'قطعة',
    total: 'المجموع الكلي',
    totalItems: 'إجمالي المنتجات',
    totalPrice: 'المبلغ الإجمالي',
    clearCart: 'إفراغ السلة',
    checkout: 'إتمام الطلب',
    sendWhatsApp: 'إرسال الطلب عبر واتساب',
    generateA4Invoice: 'إنشاء فاتورة A4 (بسيطة ورسمية)',
    customerInfoTitle: 'بيانات العميل للتواصل والتوصيل (اختياري):',
    customerNamePlaceholder: '١. اسم العميل...',
    customerPhonePlaceholder: '٢. رقم الهاتف المحمول...',
    customerAddressPlaceholder: '٣. عنوان التوصيل بالتفصيل...',
    customerNotesPlaceholder: '٤. طلب خاص أو ملاحظات إضافية...',
    storeInactive: 'تم إيقاف هذا المتجر مؤقتاً',
    storeInactiveSubtitle: 'قام صاحب المتجر بإيقاف عرض المنتجات في الوقت الحالي. يرجى الزيارة لاحقاً.',
    storeInactiveContact: 'للتواصل، يمكنك الاتصال برقم المتجر المتوفر في الأسفل.',
    noProductsFound: 'لا توجد منتجات معروضة في هذا المتجر حالياً.',
    noProductsMatched: 'لم يتم العثور على أي منتج يطابق بحثك.',
    contactAndAddress: 'معلومات التواصل والعنوان',
    allRightsReserved: 'جميع الحقوق محفوظة',
    poweredBy: 'مدعوم بواسطة فروشيار • Froshiar',
    a4Title: 'فاتورة الطلب الرسمية (A4)',
    a4Subtitle: 'جاهزة للطباعة، التنزيل بصيغة PDF، أو المشاركة',
    a4PrintPdf: 'طباعة / PDF',
    a4Close: 'إغلاق',
    a4StoreInvoice: 'فاتورة طلب متجر إلكتروني',
    a4InvoiceNo: 'رقم الفاتورة',
    a4Date: 'التاريخ',
    a4Time: 'الوقت',
    a4CustomerDelivery: 'معلومات العميل والتوصيل',
    a4CustomerName: 'اسم العميل',
    a4CustomerPhone: 'رقم الهاتف',
    a4DeliveryAddress: 'عنوان التوصيل',
    a4CustomerNotes: 'طلب خاص / ملاحظات',
    a4ColItemName: 'اسم المنتج',
    a4ColQty: 'الكمية',
    a4ColUnitPrice: 'سعر المفرد',
    a4ColSubtotal: 'المجموع',
    a4TotalUnits: 'إجمالي عدد القطع',
    a4GrandTotal: 'المبلغ الإجمالي المستحق',
    a4ThankYou: 'شكراً لتسوقكم من متجر',
    a4GeneratedBy: 'تم إنشاء هذه الوثيقة تلقائياً بواسطة نظام وێبستۆری فروشيار.',
    whatsappGreeting: 'مرحباً، من متجركم الإلكتروني {store} شاهدت هذه المنتجات وأرغب بطلبها:',
    whatsappCustomerDetails: 'بيانات العميل:',
    whatsappName: 'اسم العميل',
    whatsappPhone: 'رقم الهاتف',
    whatsappAddress: 'العنوان',
    whatsappNotes: 'طلب خاص / ملاحظات',
    whatsappItemsList: 'قائمة المنتجات المطلوبة:',
    whatsappQty: 'الكمية',
    whatsappTotalItems: 'إجمالي عدد المنتجات',
    whatsappTotalPrice: 'المبلغ الإجمالي',
    whatsappOrderTime: 'وقت الطلب',
    whatsappThanks: 'شكراً جزيلاً',
    unspecified: 'غير محدد',
    page: 'صفحة',
    ofPages: 'من',
    previousPage: 'السابق',
    nextPage: 'التالي',
    showingItems: 'عرض {start} - {end} من أصل {total} منتج',
  },
  en: {
    activeStore: 'Store is Active',
    cart: 'Shopping Cart',
    cartCountSuffix: 'items selected',
    cartEmpty: 'Your cart is empty!',
    cartEmptySubtitle: 'You have not added any items yet. Browse products and add your favorites to the cart.',
    returnToShopping: 'Continue Shopping',
    selectProductPrompt: 'Cart is empty',
    searchPlaceholder: 'Search products...',
    searchTitle: 'Search products',
    clearSearch: 'Clear search',
    allCategories: 'All',
    addToCart: 'Add to Cart',
    inCart: 'In Cart',
    outOfStock: 'Out of Stock',
    maxStockReached: 'Only {count} items available in stock',
    unit: 'pcs',
    total: 'Total',
    totalItems: 'Total Items',
    totalPrice: 'Total Amount',
    clearCart: 'Clear Cart',
    checkout: 'Checkout',
    sendWhatsApp: 'Send Order via WhatsApp',
    generateA4Invoice: 'Generate A4 Invoice (Clean & Formal)',
    customerInfoTitle: 'Customer & Delivery Info (Optional):',
    customerNamePlaceholder: '1. Customer Name...',
    customerPhonePlaceholder: '2. Phone Number...',
    customerAddressPlaceholder: '3. Full Delivery Address...',
    customerNotesPlaceholder: '4. Optional Request or Notes...',
    storeInactive: 'This Store is Temporarily Inactive',
    storeInactiveSubtitle: 'The store owner has paused displaying products at this time. Please check back later.',
    storeInactiveContact: 'To get in touch, you can reach out to the store contact numbers below.',
    noProductsFound: 'No products are currently available in this store.',
    noProductsMatched: 'No products matched your search keyword.',
    contactAndAddress: 'Contact & Address',
    allRightsReserved: 'All rights reserved',
    poweredBy: 'Powered by Froshiar',
    a4Title: 'Official Order Invoice (A4)',
    a4Subtitle: 'Ready to print, download as PDF, or share',
    a4PrintPdf: 'Print / PDF',
    a4Close: 'Close',
    a4StoreInvoice: 'Online Store Order Invoice',
    a4InvoiceNo: 'Invoice No.',
    a4Date: 'Date',
    a4Time: 'Time',
    a4CustomerDelivery: 'Customer & Delivery Information',
    a4CustomerName: 'Customer Name',
    a4CustomerPhone: 'Phone Number',
    a4DeliveryAddress: 'Delivery Address',
    a4CustomerNotes: 'Optional Request / Notes',
    a4ColItemName: 'Item Name',
    a4ColQty: 'Qty',
    a4ColUnitPrice: 'Unit Price',
    a4ColSubtotal: 'Subtotal',
    a4TotalUnits: 'Total Units',
    a4GrandTotal: 'Grand Total Amount',
    a4ThankYou: 'Thank you for your order with',
    a4GeneratedBy: 'This official document was automatically generated by Froshiar Webstore System.',
    whatsappGreeting: 'Hello, from your webstore {store} I saw these items and would like to order:',
    whatsappCustomerDetails: 'Customer Details:',
    whatsappName: 'Customer Name',
    whatsappPhone: 'Phone Number',
    whatsappAddress: 'Address',
    whatsappNotes: 'Special Request / Notes',
    whatsappItemsList: 'Ordered Items:',
    whatsappQty: 'Qty',
    whatsappTotalItems: 'Total Items',
    whatsappTotalPrice: 'Total Amount',
    whatsappOrderTime: 'Order Time',
    whatsappThanks: 'Thank you',
    unspecified: 'Not specified',
    page: 'Page',
    ofPages: 'of',
    previousPage: 'Previous',
    nextPage: 'Next',
    showingItems: 'Showing {start} - {end} of {total} items',
  },
};

// ── SVG FLAG ICONS (Crisp, authentic, vectorized) ──

/**
 * Flag of Kurdistan (ئاڵای کوردستان)
 * Tricolor: Red (#E41E20), White (#FFFFFF), Green (#138808) with 21-ray golden sun (#FDB913)
 */
export function KurdistanFlag({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 rounded-xs overflow-hidden shadow-2xs ${className}`}
      aria-label="ئاڵای کوردستان - کوردی"
    >
      <rect width="36" height="8" fill="#E41E20" />
      <rect y="8" width="36" height="8" fill="#FFFFFF" />
      <rect y="16" width="36" height="8" fill="#138808" />
      {/* 21-ray Golden Sun */}
      <circle cx="18" cy="12" r="3.2" fill="#FDB913" />
      {Array.from({ length: 21 }).map((_, i) => {
        const angle = (i * 360) / 21;
        return (
          <path
            key={i}
            d="M18 12 L17.5 7.2 L18 6.5 L18.5 7.2 Z"
            fill="#FDB913"
            transform={`rotate(${angle} 18 12)`}
          />
        );
      })}
    </svg>
  );
}

/**
 * Flag of Iraq (ئاڵای عێراق)
 * Tricolor: Red (#CE1126), White (#FFFFFF), Black (#000000) with green Kufic "الله أكبر"
 */
export function IraqFlag({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 rounded-xs overflow-hidden shadow-2xs ${className}`}
      aria-label="ئاڵای عێراق - عربي"
    >
      <rect width="36" height="8" fill="#CE1126" />
      <rect y="8" width="36" height="8" fill="#FFFFFF" />
      <rect y="16" width="36" height="8" fill="#000000" />
      {/* Kufic text representation "الله أكبر" in green */}
      <text
        x="18"
        y="13.5"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#007A3D"
        fontSize="5"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        الله أكبر
      </text>
    </svg>
  );
}

/**
 * Flag of United Kingdom / Britain (ئاڵای بەریتانیا)
 * Union Jack: Royal Blue (#012169), White (#FFFFFF), Red (#C8102E)
 */
export function BritainFlag({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 rounded-xs overflow-hidden shadow-2xs ${className}`}
      aria-label="ئاڵای بەریتانیا - English"
    >
      <rect width="36" height="24" fill="#012169" />
      {/* White Diagonals */}
      <path d="M0 0 L36 24 M36 0 L0 24" stroke="#FFFFFF" strokeWidth="4" />
      {/* Red Diagonals */}
      <path d="M0 0 L18 12 M36 0 L18 12 M36 24 L18 12 M0 24 L18 12" stroke="#C8102E" strokeWidth="1.8" />
      {/* White Cross */}
      <path d="M18 0 V24 M0 12 H36" stroke="#FFFFFF" strokeWidth="7" />
      {/* Red Cross */}
      <path d="M18 0 V24 M0 12 H36" stroke="#C8102E" strokeWidth="4" />
    </svg>
  );
}
