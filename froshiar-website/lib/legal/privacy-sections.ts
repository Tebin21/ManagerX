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

export const PRIVACY_SECTIONS: readonly PrivacySectionMeta[] = [
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

// ISO date, bump manually whenever the content in privacy-body.tsx changes.
export const PRIVACY_LAST_UPDATED = "2026-07-25";
export const PRIVACY_FIRST_PUBLISHED = "2026-07-25";
