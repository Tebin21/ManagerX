export type PrivacySectionId =
  | "introduction"
  | "information-we-collect"
  | "how-we-use-information"
  | "google-sign-in"
  | "firebase-services"
  | "data-storage"
  | "security"
  | "cloud-synchronization"
  | "third-party-services"
  | "business-customer-data"
  | "cookies"
  | "user-rights"
  | "data-retention"
  | "childrens-privacy"
  | "international-transfers"
  | "account-deletion"
  | "third-party-links"
  | "changes-to-policy"
  | "contact-information";

export type PrivacySectionMeta = {
  id: PrivacySectionId;
  title: string;
};

export const PRIVACY_SECTIONS_EN: readonly PrivacySectionMeta[] = [
  { id: "introduction", title: "Introduction" },
  { id: "information-we-collect", title: "Information We Collect" },
  { id: "how-we-use-information", title: "How We Use Your Information" },
  { id: "google-sign-in", title: "Google Sign-In" },
  { id: "firebase-services", title: "Firebase Services" },
  { id: "data-storage", title: "Data Storage" },
  { id: "security", title: "Security" },
  { id: "cloud-synchronization", title: "Cloud Synchronization" },
  { id: "third-party-services", title: "Third-Party Services" },
  { id: "business-customer-data", title: "Business Customer Data" },
  { id: "cookies", title: "Cookies (Web)" },
  { id: "user-rights", title: "User Rights" },
  { id: "data-retention", title: "Data Retention" },
  { id: "childrens-privacy", title: "Children's Privacy" },
  { id: "international-transfers", title: "International Transfers" },
  { id: "account-deletion", title: "Account Deletion" },
  { id: "third-party-links", title: "Third-Party Links" },
  { id: "changes-to-policy", title: "Changes to this Privacy Policy" },
  { id: "contact-information", title: "Contact Information" },
];

export const PRIVACY_SECTIONS_CKB: readonly PrivacySectionMeta[] = [
  { id: "introduction", title: "پێشەکی" },
  { id: "information-we-collect", title: "ئەو زانیارییانەی کۆیان دەکەینەوە" },
  { id: "how-we-use-information", title: "چۆنیەتی بەکارهێنانی زانیارییەکانت" },
  { id: "google-sign-in", title: "چوونەژوورەوە لە ڕێگەی گووگڵ (Google Sign-In)" },
  { id: "firebase-services", title: "خزمەتگوزارییەکانی فایەربەیس (Firebase)" },
  { id: "data-storage", title: "هەڵگرتنی داتا و زانیارییەکان" },
  { id: "security", title: "پاراستن و ئاسایش" },
  { id: "cloud-synchronization", title: "هاوکاتکردنی هەوری (Cloud Synchronization)" },
  { id: "third-party-services", title: "خزمەتگوزارییەکانی لایەنی سێیەم" },
  { id: "business-customer-data", title: "داتای کڕیارانی فرۆشگا و کارەکەت" },
  { id: "cookies", title: "کووکیز (ماڵپەڕ)" },
  { id: "user-rights", title: "مافەکانی بەکارهێنەر" },
  { id: "data-retention", title: "ماوەی هێشتنەوەی داتا" },
  { id: "childrens-privacy", title: "پاراستنی تایبەتمەندی منداڵان" },
  { id: "international-transfers", title: "گواستنەوەی نێودەوڵەتی داتا" },
  { id: "account-deletion", title: "سڕینەوەی هەژمار" },
  { id: "third-party-links", title: "بەستەرەکانی لایەنی سێیەم" },
  { id: "changes-to-policy", title: "گۆڕانکاری لە سیاسەتی پاراستنی نهێنی" },
  { id: "contact-information", title: "زانیاری پەیوەندی" },
];

export function getPrivacySections(locale?: string): readonly PrivacySectionMeta[] {
  return locale === "ckb" ? PRIVACY_SECTIONS_CKB : PRIVACY_SECTIONS_EN;
}

export const PRIVACY_SECTIONS = PRIVACY_SECTIONS_EN;

// ISO date, bump manually whenever the content in privacy-body.tsx changes.
export const PRIVACY_LAST_UPDATED = "2026-07-25";
export const PRIVACY_FIRST_PUBLISHED = "2026-07-25";
