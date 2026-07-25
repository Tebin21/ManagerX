import type { ReactNode } from "react";
import type { PrivacySectionId } from "./privacy-sections";
import { ExternalLink, SectionAnchorLink, MailLink, List } from "./legal-ui";

export const PRIVACY_BODY: Record<PrivacySectionId, ReactNode> = {
  introduction: (
    <>
      <p>
        Froshiar (&ldquo;Froshiar,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) is a business
        management platform that helps businesses manage sales, purchases, inventory, customers, suppliers,
        expenses, reports, business analytics, and an online store, available on Android, iOS, and the web at{" "}
        <ExternalLink href="https://www.froshiar.store">www.froshiar.store</ExternalLink>.
      </p>
      <p>
        This Privacy Policy explains what information we collect, how we use and protect it, and the choices
        and rights you have regarding your information when you use the Froshiar app or website (together, the
        &ldquo;Service&rdquo;). It applies across all platforms on which Froshiar is offered.
      </p>
      <p>
        By using the Service, you agree to the collection and use of information as described in this policy.
        This policy is effective and authoritative as of the &ldquo;Last updated&rdquo; date shown at the top
        of this page.
      </p>
    </>
  ),

  "information-we-collect": (
    <>
      <p>We collect the following categories of information to provide and improve the Service.</p>

      <h3 className="mt-5 text-sm font-semibold text-ink">Account Information</h3>
      <p>
        When you sign in with Google, we receive your name, email address, and profile identifier from your
        Google account, which we use to create and secure your Froshiar account. We do not offer or store
        email/password credentials of our own — see <SectionAnchorLink href="#google-sign-in">Google Sign-In</SectionAnchorLink>.
      </p>

      <h3 className="mt-5 text-sm font-semibold text-ink">Business Information</h3>
      <p>
        Information you enter to run your business through the Service — such as products, sales, purchases,
        inventory, customers, suppliers, expenses, and related records. This information is yours; we process
        it solely to operate the Service on your behalf.
      </p>

      <h3 className="mt-5 text-sm font-semibold text-ink">Technical Information</h3>
      <p>
        Basic technical information, such as your IP address and general device or browser type, is
        incidentally processed by our infrastructure and service providers (such as Firebase and Supabase) as
        part of ordinary network communication when the Service is used.
      </p>

      <h3 className="mt-5 text-sm font-semibold text-ink">Analytics, Crash Reporting &amp; Advertising</h3>
      <p>
        We do not currently use analytics, crash reporting, or advertising services in the Service, and the
        Service does not display ads. If we add any such service in the future, we will update this Privacy
        Policy before or at the time it takes effect.
      </p>
    </>
  ),

  "how-we-use-information": (
    <>
      <p>We use the information we collect to:</p>
      <List
        items={[
          "Provide, operate, and maintain the Service across your devices.",
          "Authenticate you securely via Google Sign-In.",
          "Synchronize your business data across your devices when Cloud Synchronization is enabled.",
          "Respond to support requests and communicate with you about the Service.",
          "Maintain, troubleshoot, and improve the Service, including fixing bugs and stability issues.",
          "Comply with legal obligations and enforce our terms.",
        ]}
      />
      <p>We do not use your business data to train third-party models, and we do not sell your personal data.</p>
    </>
  ),

  "google-sign-in": (
    <>
      <p>
        Google Sign-In is currently the only way to create and access a Froshiar account — we do not offer
        email/password accounts. Sign-in is handled through Firebase Authentication, Google&rsquo;s
        authentication infrastructure.
      </p>
      <p>
        When you sign in with Google, we receive your name, email address, and a unique profile identifier from
        Google. Froshiar never receives or has access to your Google account password.
      </p>
      <p>
        Google&rsquo;s own handling of your data is governed by Google&rsquo;s Privacy Policy, available at{" "}
        <ExternalLink href="https://policies.google.com/privacy">policies.google.com/privacy</ExternalLink>.
      </p>
    </>
  ),

  "firebase-services": (
    <>
      <p>
        Froshiar currently uses Firebase Authentication solely to power Google Sign-In, as described above. We
        do not currently make confirmed use of any other Firebase product (such as Crashlytics or Analytics) in
        the Service.
      </p>
      <p>
        If we begin using additional Firebase products in the future, we will update this Privacy Policy to
        reflect that change before or at the time it takes effect.
      </p>
      <p>
        Firebase is provided by Google; Firebase&rsquo;s data handling practices are described at{" "}
        <ExternalLink href="https://firebase.google.com/support/privacy">
          firebase.google.com/support/privacy
        </ExternalLink>
        .
      </p>
    </>
  ),

  "data-storage": (
    <>
      <p>
        Froshiar is offline-first: your business data is stored locally on your device by default, so the
        Service remains usable without an internet connection.
      </p>
      <p>
        If you choose to enable Cloud Synchronization, a copy of your business data is also stored on
        reputable third-party cloud infrastructure (Supabase) so it can be backed up and kept in sync across
        your devices. See <SectionAnchorLink href="#cloud-synchronization">Cloud Synchronization</SectionAnchorLink> for
        details.
      </p>
    </>
  ),

  security: (
    <>
      <p>
        We take reasonable technical and administrative measures designed to protect your information,
        including transmitting data over encrypted (TLS/HTTPS) connections when it travels between your device
        and our service providers.
      </p>
      <p>
        However, no method of transmission over the internet or method of electronic storage is completely
        secure. While we strive to protect your information, we cannot guarantee its absolute security. You are
        also responsible for keeping your device and Google account credentials secure.
      </p>
    </>
  ),

  "cloud-synchronization": (
    <>
      <p>
        Cloud Synchronization is an optional, opt-in feature. When you enable it, your business data is
        securely transmitted to and stored by Supabase, our cloud infrastructure provider, so that it can be
        backed up and kept in sync across the devices you use to access your Froshiar account.
      </p>
      <p>
        Supabase is used exclusively for storing and synchronizing your business data — it is never used to
        authenticate you; authentication is always handled separately through Google Sign-In.
      </p>
      <p>
        You can disable Cloud Synchronization at any time from within the app&rsquo;s settings; your data will
        continue to be available locally on your device.
      </p>
    </>
  ),

  "third-party-services": (
    <>
      <p>The Service relies on the following third-party service providers to operate:</p>
      <List
        items={[
          <>
            <strong className="text-ink">Google / Firebase</strong> &mdash; for Google Sign-In authentication.
            See{" "}
            <ExternalLink href="https://policies.google.com/privacy">
              Google&rsquo;s Privacy Policy
            </ExternalLink>
            .
          </>,
          <>
            <strong className="text-ink">Supabase</strong> &mdash; for optional Cloud Synchronization storage.
            See{" "}
            <ExternalLink href="https://supabase.com/privacy">Supabase&rsquo;s Privacy Policy</ExternalLink>.
          </>,
        ]}
      />
      <p>
        We do not sell your personal data to any third party. If we add further third-party service providers
        in the future, we will update this Privacy Policy accordingly.
      </p>
    </>
  ),

  "business-customer-data": (
    <>
      <p>
        The Service lets business users store records about their own customers, suppliers, and employees
        (such as names, phone numbers, and transaction history) in order to run their business. In connection
        with this data, you (the business using Froshiar) act as the data controller, and Froshiar acts as a
        data processor, storing and processing this data solely on your behalf and in accordance with your
        instructions.
      </p>
      <p>
        If you enter another individual&rsquo;s personal information into the Service, you are responsible for
        ensuring you have the right to do so and for complying with applicable data protection laws with
        respect to that individual, including responding to their rights requests.
      </p>
    </>
  ),

  cookies: (
    <>
      <p>
        On our website and web app, we use only essential/session cookies and similar technologies necessary
        to operate the site (for example, to remember your language or theme preference). We do not currently
        use third-party advertising or tracking cookies.
      </p>
      <p>
        You can control or disable cookies through your browser settings; doing so may affect some website
        functionality. This section applies to the web version of the Service only — the Android and iOS apps
        do not use browser cookies.
      </p>
    </>
  ),

  "user-rights": (
    <>
      <p>
        Depending on your location, you may have the following rights regarding your personal information under
        applicable data protection laws, including the GDPR:
      </p>
      <List
        items={[
          "Access the personal information we hold about you.",
          "Correct inaccurate or incomplete information.",
          "Request erasure of your personal information.",
          "Restrict or object to certain processing of your information.",
          "Receive a copy of your information in a portable format.",
          "Withdraw consent at any time, where processing is based on consent.",
          "Lodge a complaint with your local data protection supervisory authority.",
        ]}
      />
      <p>
        To exercise any of these rights, contact us at <MailLink>support@froshiar.store</MailLink>.
      </p>
    </>
  ),

  "data-retention": (
    <>
      <p>
        We retain your data only as long as necessary to provide the Service or comply with our legal
        obligations.
      </p>
      <p>
        When you request account deletion, we will delete or anonymize your personal information within a
        reasonable period, unless retention is required by law.
      </p>
    </>
  ),

  "childrens-privacy": (
    <>
      <p>
        The Service is not directed to children, and we do not knowingly collect personal information from
        children under the age of 13 (or the equivalent minimum age in your jurisdiction, such as 16 under the
        GDPR for information-society services offered directly to a child).
      </p>
      <p>
        If you believe a child has provided us with personal information, please contact us at{" "}
        <MailLink>support@froshiar.store</MailLink> and we will take steps to delete such information.
      </p>
    </>
  ),

  "international-transfers": (
    <>
      <p>
        Your information may be processed and stored in countries other than the one in which you reside,
        including wherever our service providers (such as Google/Firebase and Supabase) operate their
        infrastructure.
      </p>
      <p>
        When your information is transferred internationally, we rely on the safeguards those providers offer
        for cross-border data transfers. By using the Service, you understand that your information may be
        transferred to and processed in such countries.
      </p>
    </>
  ),

  "account-deletion": (
    <>
      <p>
        You may request deletion of your Froshiar account and associated personal information at any time by
        emailing <MailLink>support@froshiar.store</MailLink> from the email address associated with your
        account, requesting account deletion.
      </p>
      <p>
        Once we verify your request, we will delete or anonymize your personal information and account data as
        described in <SectionAnchorLink href="#data-retention">Data Retention</SectionAnchorLink> above. Locally stored
        data on your own device can also be removed at any time by uninstalling the app or clearing its data.
      </p>
    </>
  ),

  "third-party-links": (
    <>
      <p>
        The Service may contain links to third-party websites or services (for example, app store listings or
        our service providers&rsquo; own sites) that are not operated by us. We are not responsible for the
        content, privacy practices, or terms of any third-party site. We encourage you to review the privacy
        policy of any third-party site you visit.
      </p>
    </>
  ),

  "changes-to-policy": (
    <>
      <p>
        We may update this Privacy Policy from time to time. The &ldquo;Last updated&rdquo; date at the top of
        this page indicates when it was last revised, and the version published here is always the
        authoritative one.
      </p>
      <p>
        If we make material changes, we will provide notice through the app, our website, or by other
        reasonable means before the changes take effect. Your continued use of the Service after a change
        becomes effective constitutes acceptance of the revised policy.
      </p>
    </>
  ),

  "contact-information": (
    <>
      <p>If you have any questions about this Privacy Policy or how we handle your information, contact us:</p>
      <List
        items={[
          <>
            <strong className="text-ink">Brand:</strong> Froshiar
          </>,
          <>
            <strong className="text-ink">Website:</strong>{" "}
            <ExternalLink href="https://www.froshiar.store">https://www.froshiar.store</ExternalLink>
          </>,
          <>
            <strong className="text-ink">Support email:</strong>{" "}
            <MailLink>support@froshiar.store</MailLink>
          </>,
        ]}
      />
      <p>
        If our contact details change, we will update this section so this page always reflects the current
        way to reach us.
      </p>
    </>
  ),
};
