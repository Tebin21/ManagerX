export type TermsSectionId =
  | "acceptance"
  | "eligibility"
  | "user-accounts"
  | "business-accounts"
  | "acceptable-use"
  | "prohibited-activities"
  | "customer-data"
  | "intellectual-property"
  | "software-license"
  | "online-store-services"
  | "subscriptions-and-paid-services"
  | "availability-of-services"
  | "third-party-services"
  | "user-responsibilities"
  | "security-responsibilities"
  | "suspension-and-termination"
  | "disclaimer-of-warranties"
  | "limitation-of-liability"
  | "indemnification"
  | "updates-to-terms"
  | "contact-information";

export type TermsSectionMeta = {
  id: TermsSectionId;
  title: string;
};

export const TERMS_SECTIONS_EN: readonly TermsSectionMeta[] = [
  { id: "acceptance", title: "Acceptance of Terms" },
  { id: "eligibility", title: "Eligibility" },
  { id: "user-accounts", title: "User Accounts" },
  { id: "business-accounts", title: "Business Accounts" },
  { id: "acceptable-use", title: "Acceptable Use" },
  { id: "prohibited-activities", title: "Prohibited Activities" },
  { id: "customer-data", title: "Customer Data" },
  { id: "intellectual-property", title: "Intellectual Property" },
  { id: "software-license", title: "Software License" },
  { id: "online-store-services", title: "Online Store Services" },
  { id: "subscriptions-and-paid-services", title: "Subscriptions and Future Paid Services" },
  { id: "availability-of-services", title: "Availability of Services" },
  { id: "third-party-services", title: "Third-Party Services" },
  { id: "user-responsibilities", title: "User Responsibilities" },
  { id: "security-responsibilities", title: "Security Responsibilities" },
  { id: "suspension-and-termination", title: "Account Suspension or Termination" },
  { id: "disclaimer-of-warranties", title: "Disclaimer of Warranties" },
  { id: "limitation-of-liability", title: "Limitation of Liability" },
  { id: "indemnification", title: "Indemnification" },
  { id: "updates-to-terms", title: "Updates to the Terms" },
  { id: "contact-information", title: "Contact Information" },
];

export const TERMS_SECTIONS_CKB: readonly TermsSectionMeta[] = [
  { id: "acceptance", title: "قبوڵکردنی مەرجەکان" },
  { id: "eligibility", title: "شیاوی بۆ بەکارهێنان" },
  { id: "user-accounts", title: "هەژماری بەکارهێنەران" },
  { id: "business-accounts", title: "هەژماری کار و فرۆشگاکان" },
  { id: "acceptable-use", title: "بەکارهێنانی ڕێگەپێدراو" },
  { id: "prohibited-activities", title: "کردەوە قەدەغەکراوەکان" },
  { id: "customer-data", title: "داتای کڕیارانی تۆ" },
  { id: "intellectual-property", title: "مافی خاوەندارێتی هزری" },
  { id: "software-license", title: "مۆڵەتی بەکارهێنانی بەرنامە" },
  { id: "online-store-services", title: "خزمەتگوزارییەکانی فرۆشگای ئۆنلاین" },
  { id: "subscriptions-and-paid-services", title: "بەشداریکردن و خزمەتگوزارییە پارەپێدراوەکان" },
  { id: "availability-of-services", title: "بەردەستبوونی خزمەتگوزارییەکان" },
  { id: "third-party-services", title: "خزمەتگوزارییەکانی لایەنی سێیەم" },
  { id: "user-responsibilities", title: "بەرپرسیاریەتییەکانی بەکارهێنەر" },
  { id: "security-responsibilities", title: "بەرپرسیاریەتییەکانی ئاسایش" },
  { id: "suspension-and-termination", title: "ڕاگرتن یاخود کۆتاییهێنان بە هەژمار" },
  { id: "disclaimer-of-warranties", title: "ڕەتکردنەوەی گەرەنتییەکان" },
  { id: "limitation-of-liability", title: "سنووردارکردنی بەرپرسیاریەتی" },
  { id: "indemnification", title: "قەرەبووکردنەوە و بێبەریبوون" },
  { id: "updates-to-terms", title: "نوێکردنەوەی مەرجەکان" },
  { id: "contact-information", title: "زانیاری پەیوەندی" },
];

export function getTermsSections(locale?: string): readonly TermsSectionMeta[] {
  return locale === "ckb" ? TERMS_SECTIONS_CKB : TERMS_SECTIONS_EN;
}

export const TERMS_SECTIONS = TERMS_SECTIONS_EN;

// ISO date, bump manually whenever the content in terms-body.tsx changes.
export const TERMS_LAST_UPDATED = "2026-07-25";
export const TERMS_FIRST_PUBLISHED = "2026-07-25";
