import type { ReactNode } from "react";
import type { PrivacySectionId } from "./privacy-sections";
import { ExternalLink, SectionAnchorLink, MailLink, List } from "./legal-ui";

export const PRIVACY_BODY_EN: Record<PrivacySectionId, ReactNode> = {
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
        To exercise any of these rights, contact us at <MailLink>tebin.faruq@gmail.com</MailLink>.
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
        <MailLink>tebin.faruq@gmail.com</MailLink> and we will take steps to delete such information.
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
        emailing <MailLink>tebin.faruq@gmail.com</MailLink> from the email address associated with your
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
            <MailLink>tebin.faruq@gmail.com</MailLink>
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

export const PRIVACY_BODY_CKB: Record<PrivacySectionId, ReactNode> = {
  introduction: (
    <>
      <p>
        فرۆشیار (&laquo;فرۆشیار&raquo;، &laquo;ئێمە&raquo;، یان &laquo;تایبەت بە ئێمە&raquo;) پلاتفۆرمێکی پێشکەوتووی
        بەڕێوەبردنی کار و فرۆشگایە کە یارمەتی خاوەن کار و دوکاندارەکان دەدات بۆ بەڕێوەبردنی فرۆشتن، کڕین، کۆگا، کڕیاران،
        دابینکەران، خەرجییەکان، ڕاپۆرتە داراییەکان، شیکاری کار، و فرۆشگای ئۆنلاین؛ بەردەستە لەسەر ئەندرۆید، ئایفۆن (iOS) و لە ڕێگەی
        وێبەوە لە{" "}
        <ExternalLink href="https://www.froshiar.store">www.froshiar.store</ExternalLink>.
      </p>
      <p>
        ئەم سیاسەتی پاراستنی نهێنییە ڕوونی دەکاتەوە کە چ جۆرە زانیارییەک کۆدەکەینەوە، چۆن بەکاری دەهێنین و دەیپارێزین، و چ ماف و
        هەڵبژاردنێکت هەیە سەبارەت بە زانیارییەکانت کاتێک ئەپی فرۆشیار یان ماڵپەڕەکەی بەکاردەهێنیت (پێکەوە: &laquo;خزمەتگوزاری&raquo;). ئەم
        سیاسەتە بەسەر تەواوی ئەو پلاتفۆرمانەدا جێبەجێ دەبێت کە فرۆشیاریان لەسەر پێشکەش دەکرێت.
      </p>
      <p>
        بە بەکارهێنانی ئەم خزمەتگوزارییە، تۆ ڕازی دەبیت بە کۆکردنەوە و بەکارهێنانی زانیارییەکان بەپێی ئەوەی لەم سیاسەتەدا دیاریکراوە.
        ئەم سیاسەتە لەو بەروارەی لە سەرەوە وەک &laquo;دواین نوێکردنەوە&raquo; دانراوە کارپێکراوە و دەچێتە بواری جێبەجێکردنەوە.
      </p>
    </>
  ),

  "information-we-collect": (
    <>
      <p>ئێمە ئەم جۆرانە لە زانیاری کۆدەکەینەوە بە مەبەستی پێشکەشکردن و بەردەوام باشترکردنی خزمەتگوزارییەکە:</p>

      <h3 className="mt-5 text-sm font-semibold text-ink dark:text-gold-300">زانیارییەکانی هەژمار (Account Information)</h3>
      <p>
        کاتێک لە ڕێگەی گووگڵەوە (Google Sign-In) دەچیتە ژوورەوە، ئێمە ناو، ناونیشانی ئیمەیڵ، و ناسێنەری پرۆفایل لە هەژماری
        گووگڵەکەتەوە وەردەگرین بۆ دروستکردن و پاراستنی هەژماری فرۆشیارەکەت. ئێمە سیستەمی ئیمەیڵ و وشەی نهێنی سەربەخۆی خۆمان پێشکەش ناکەین
        و کۆی ناکەینەوە — بڕوانە بەشی <SectionAnchorLink href="#google-sign-in">چوونەژوورەوە لە ڕێگەی گووگڵ</SectionAnchorLink>.
      </p>

      <h3 className="mt-5 text-sm font-semibold text-ink dark:text-gold-300">زانیارییەکانی کار و بازرگانی (Business Information)</h3>
      <p>
        ئەو زانیارییانەی تۆ بۆ بەڕێوەبردنی کارەکەت لە سیستەمەکەدا تۆماریان دەکەیت — وەک کاڵاکان، نرخەکان، فرۆشتن، کڕین، کۆگا، کڕیاران،
        دابینکەران، خەرجییەکان و تۆمارە پەیوەندیدارەکان. ئەم زانیارییانە بە تەواوی موڵکی خۆتن؛ ئێمە تەنها و تەنها بۆ بەگەڕخستنی
        خزمەتگوزارییەکە لەسەر داوای تۆ پرۆسێسیان دەکەین.
      </p>

      <h3 className="mt-5 text-sm font-semibold text-ink dark:text-gold-300">زانیارییە تەکنیکییەکان (Technical Information)</h3>
      <p>
        زانیارییە سەرەتاییە تەکنیکییەکان وەک ناونیشانی IP، جۆری گشتی ئامێر یان وێبگەڕ (Browser) لە لایەن ژێرخانی ڕاژەکاری ئێمە و دابینکەرانی
        خزمەتگوزاریمانەوە (وەک Firebase و Supabase) وەک بەشێکی ئاسایی پەیوەندی تۆڕ لە کاتی بەکارهێنانی خزمەتگوزارییەکەدا پرۆسێس دەکرێت.
      </p>

      <h3 className="mt-5 text-sm font-semibold text-ink dark:text-gold-300">شیکاری، ڕاپۆرتی لەکارکەوتن و ڕیکلام</h3>
      <p>
        لە ئێستادا ئێمە هیچ خزمەتگوزارییەکی شیکاری داتای لایەنی سێیەم، ڕاپۆرتی تێکچوون یان ڕیکلام لە ئەپەکەدا بەکارناهێنین، و
        خزمەتگوزارییەکە بە هیچ جۆرێک ڕیکلام پیشان نادات. ئەگەر لە داهاتوودا هەر خزمەتگوزارییەکی لەو شێوەیە زیاد بکرێت، پێشوەختە ئەم سیاسەتە
        نوێ دەکەینەوە.
      </p>
    </>
  ),

  "how-we-use-information": (
    <>
      <p>ئێمە زانیارییە کۆکراوەکان بەکاردەهێنین بۆ ئەم مەبەستانە:</p>
      <List
        items={[
          "پێشکەشکردن، کارپێکردن و پاراستنی خزمەتگوزارییەکە لەسەر تەواوی ئامێرەکانت.",
          "ناساندن و چوونەژوورەوەی پارێزراوت لە ڕێگەی Google Sign-In.",
          "هاوکاتکردنی داتای بازرگانییەکەت لەنێوان ئامێرەکانتدا لە کاتی چالاککردنی هاوکاتکردنی هەوریدا.",
          "وەڵامدانەوەی داواکارییەکانی پەیوەندی، هاوکاری و پشتیوانی تەکنیکی سەبارەت بە خزمەتگوزارییەکە.",
          "چاودێری، چارەسەرکردنی هەڵەکان (Bug Fixes) و باشترکردنی سەقامگیری و خێرایی سیستەمەکە.",
          "پابەندبوون بە ئەرکە یاساییەکان و جێبەجێکردنی مەرجەکانی بەکارهێنانمان.",
        ]}
      />
      <p>
        ئێمە هەرگیز داتای بازرگانیت بۆ ڕاهێنانی مۆدێلەکانی ژیریی دەستکردی لایەنی سێیەم بەکارناهێنین، و بە هیچ شێوەیەک زانیارییە
        کەسییەکانت نافرۆشین.
      </p>
    </>
  ),

  "google-sign-in": (
    <>
      <p>
        لە ئێستادا چوونەژوورەوە لە ڕێگەی گووگڵ (Google Sign-In) تاکە ڕێگایە بۆ دروستکردن و چوونە ناو هەژماری فرۆشیار — ئێمە هەژماری ئیمەیڵ
        و وشەی نهێنی سەربەخۆ پێشکەش ناکەین. ئەم پرۆسەیە لە ڕێگەی ژێرخانی فەرمی Firebase Authenticationی گووگڵەوە بەڕێوەدەچێت.
      </p>
      <p>
        کاتێک بە گووگڵ دەچیتە ژوورەوە، ناو، ناونیشانی ئیمەیڵ و ناسێنەری تایبەتی پرۆفایل لە گووگڵەوە وەردەگرین. فرۆشیار هەرگیز وشەی نهێنی
        (Password)ی هەژماری گووگڵەکەت وەرناگرێت و نایبینێت.
      </p>
      <p>
        شێوازی پاراستن و مامەڵەکردنی گووگڵ لەگەڵ داتاکانت بەپێی سیاسەتی پاراستنی نهێنی گووگڵ بەڕێوەدەچێت، لە{" "}
        <ExternalLink href="https://policies.google.com/privacy">policies.google.com/privacy</ExternalLink>.
      </p>
    </>
  ),

  "firebase-services": (
    <>
      <p>
        فرۆشیار لە ئێستادا خزمەتگوزارییەکانی فایەربەیس (Firebase Authentication) تەنها بۆ مەبەستی بەڕێوەبردنی چوونەژوورەوەی گووگڵ
        بەکاردەهێنێت. ئێمە لە ئێستادا هیچ بەرهەمێکی تری فایەربەیس (وەک Crashlytics یان Google Analytics) لەناو ئەپەکەدا بەکارناهێنین.
      </p>
      <p>
        ئەگەر لە داهاتوودا هەر بەرهەمێکی تری فایەربەیس زیاد بکرێت، ئەم پەڕەیە پێشوەختە نوێ دەکەینەوە تاوەکو ئەو گۆڕانکارییانە ڕوون
        بکاتەوە.
      </p>
      <p>
        خزمەتگوزارییەکانی فایەربەیس لە لایەن گووگڵەوە دابین دەکرێن؛ دەتوانیت زانیاری زیاتر لەبارەی پاراستنی داتا لە فایەربەیس بخوێنیتەوە لە{" "}
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
        فرۆشیار لە بنەڕەتدا بە سیستەمی کارکردنی سەربەخۆی ئۆفلاین (Offline-First) بنیادنراوە: هەموو داتاکانی فرۆشتن، کۆگا و حساباتت بە
        شێوەیەکی بنەڕەتی لەناو ئامێرەکەی خۆتدا بە پارێزراوی هەڵدەگیرێن، بۆیە ئەپەکە تەنانەت بەبێ هەبوونی هێڵی ئینتەرنێتیش بە تەواوی کاردەکات.
      </p>
      <p>
        ئەگەر بڕیار بدەیت تایبەتمەندی هاوکاتکردنی هەوری (Cloud Synchronization) چالاک بکەیت، کۆپییەکی پارێزراو لە داتاکانت لەسەر ژێرخانی
        هەوری ناسراو و باوەڕپێکراوی (Supabase) هەڵدەگیرێت بۆ پاراستنی یەدەگ (Backup) و هاوکاتکردن لەنێوان ئامێرەکانتدا. بڕوانە بەشی{" "}
        <SectionAnchorLink href="#cloud-synchronization">هاوکاتکردنی هەوری</SectionAnchorLink> بۆ وردەکاری زیاتر.
      </p>
    </>
  ),

  security: (
    <>
      <p>
        ئێمە ڕێکاری ئەمنی و تەکنیکی توند دەگرینەبەر بۆ پاراستنی زانیارییەکانت، لەوانە گواستنەوەی داتا لە ڕێگەی هێڵی کۆدکراوی پارێزراو
        (TLS/HTTPS) کاتێک پەیوەندی لەنێوان ئامێرەکەت و دابینکەرانی خزمەتگوزاریماندا دروست دەبێت.
      </p>
      <p>
        لەگەڵ ئەوەشدا، هیچ ڕێگایەکی پەیوەندی ئینتەرنێت یان هەڵگرتنی دیجیتاڵی ١٠٠٪ پارێزراو نییە لە مەترسی. لە کاتێکدا ئێمە بەوپەڕی تواناوە
        هەوڵی پاراستنی داتاکانت دەدەین، پێویستە خۆیشت بەرپرسیار بیت لە پاراستنی ئامێرەکەت و زانیارییەکانی هەژماری گووگڵەکەت.
      </p>
    </>
  ),

  "cloud-synchronization": (
    <>
      <p>
        هاوکاتکردنی هەوری (Cloud Synchronization) تایبەتمەندییەکی ئارەزوومەندانەیە کە بە هەڵبژاردنی خۆت چالاک دەکرێت. کاتێک چالاکی
        دەکەیت، داتاکانت بە شێوازێکی کۆدکراو دەگوازرێتەوە بۆ Supabase کە دابینکەری ژێرخانی هەوریمانە، بۆ ئەوەی داتاکانت پارێزراو بن و
        لە تەواوی ئەو ئامێرانەی فرۆشیاریان لەسەرە هاوکات بن.
      </p>
      <p>
        Supabase تەنها و تەنها بۆ هەڵگرتن و هاوکاتکردنی داتای کارەکەت بەکاردێت — هەرگیز بۆ ناسینەوە یان وشەی نهێنی بەکارناهێنرێت؛ چوونەژوورەوە
        هەمیشە لە ڕێگەی Google Sign-In جیاکراوەتەوە.
      </p>
      <p>
        دەتوانیت لە هەر ساتێکدا لە بەشی ڕێکخستنەکانی ئەپەکەوە هاوکاتکردنی هەوری بکوژێنیتەوە؛ داتاکانت بە سەربەخۆیی لەسەر ئامێرەکەت بەردەوام
        دەبن.
      </p>
    </>
  ),

  "third-party-services": (
    <>
      <p>سیستەمی فرۆشیار بۆ بەڕێوەچوونی کارەکانی پشت بەم خزمەتگوزارییە متمانەپێکراوانەی لایەنی سێیەم دەبەستێت:</p>
      <List
        items={[
          <>
            <strong className="text-ink dark:text-gold-300">Google / Firebase</strong> &mdash; بۆ چوونەژوورەوەی پارێزراوی گووگڵ. بڕوانە{" "}
            <ExternalLink href="https://policies.google.com/privacy">سیاسەتی پاراستنی نهێنی گووگڵ</ExternalLink>.
          </>,
          <>
            <strong className="text-ink dark:text-gold-300">Supabase</strong> &mdash; بۆ خزمەتگوزاری هەڵبژاردەیی هەڵگرتن و هاوکاتکردنی هەوری. بڕوانە{" "}
            <ExternalLink href="https://supabase.com/privacy">سیاسەتی پاراستنی نهێنی Supabase</ExternalLink>.
          </>,
        ]}
      />
      <p>
        ئێمە زانیارییە کەسییەکانت بە هیچ لایەنێکی سێیەم نافرۆشین. ئەگەر لە داهاتوودا هەر دابینکەرێکی تر زیاد بکرێت، ئەم سیاسەتە بەپێی
        پێویست نوێ دەکەینەوە.
      </p>
    </>
  ),

  "business-customer-data": (
    <>
      <p>
        ئەم خزمەتگوزارییە ڕێگەت پێدەدات تۆماری تایبەت بە کڕیاران، دابینکەران و کارمەندانی کارەکەت (وەک ناو، ژمارەی تەلەفۆن، ناونیشان و
        مێژووی فرۆشتن و قەرز) تۆمار بکەیت تا کارەکەت بەڕێوەببەیت. سەبارەت بەم زانیارییانە، تۆ (خاوەن کار) وەک کۆنترۆڵکەری سەرەکی داتا
        (Data Controller) دادەنرێیت، و فرۆشیار وەک پرۆسێسکەری داتا (Data Processor) کاردەکات کە تەنها لەسەر ڕێنمایی تۆ داتاکە هەڵدەگرێت
        و دەپارێزێت.
      </p>
      <p>
        ئەگەر زانیاری کەسانی تر تۆمار بکەیت، تۆ بەرپرسیاری لەوەی کە مافی یاساییت هەبێت بۆ کۆکردنەوەیان و پابەند بیت بە یاساکانی پاراستنی
        نهێنی لە بەرامبەر ئەو کەسانەدا.
      </p>
    </>
  ),

  cookies: (
    <>
      <p>
        لە ماڵپەڕی فەرمی و وێب ئەپەکەماندا، تەنها کووکیزە سەرەکییە پێویستەکان بەکاردەهێنین بۆ کارپێکردنی ماڵپەڕەکە (بۆ نموونە، بۆ
        بیرهاتنەوەی زمانی هەڵبژێردراو یان ڕووکاری ڕەنگ). ئێمە هیچ کووکییەکی بەدواداچوون یان ڕیکلامی لایەنی سێیەم بەکارناهێنین.
      </p>
      <p>
        دەتوانیت لە ڕێگەی ڕێکخستنەکانی وێبگەڕەکەتەوە (Browser) کۆنترۆڵی کووکیز بکەیت یان بیبڕیت. ئەم بەشە تەنها پەیوەندی بە وێبەوە هەیە —
        ئەپەکانی ئەندرۆید و ئایفۆن کووکیزی وێبگەڕ بەکارناهێنن.
      </p>
    </>
  ),

  "user-rights": (
    <>
      <p>
        بەپێی شوێنی نیشتەجێبوونت و یاسا پەیوەندیدارەکانی پاراستنی داتا (لەوانە GDPR)، تۆ خاوەنی ئەم مافە یاساییانەی لە بەرامبەر زانیارییە
        کەسییەکانتدا:
      </p>
      <List
        items={[
          "دەستگەیشتن بەو زانیارییە کەسییانەی کە لەلای ئێمە تۆمارکراون.",
          "ڕاستکردنەوە و چاککردنی هەر زانیارییەکی نادروست یان ناتەواو.",
          "داواکردنی سڕینەوەی یەکجارەکی زانیارییە کەسییەکانت.",
          "سنووردارکردن یان ڕەتکردنەوەی هەندێک جۆری پرۆسێسکردنی داتاکانت.",
          "وەرگرتنی کۆپییەکی داتاکانت بە فۆرماتێکی ڕوون و گونجاو.",
          "پاشگەزبوونەوە لە ڕەزامەندی لە هەر کاتێکدا، کاتێک پرۆسێسکردن لەسەر بنەمای ڕەزامەندی بێت.",
          "تۆمارکردنی سکاڵا لای دەسەڵاتی فەرمی چاودێری پاراستنی داتای ناوچەکەت.",
        ]}
      />
      <p>
        بۆ بەکارهێنانی هەر یەکێک لەم مافانە، دەتوانیت ڕاستەوخۆ پەیوەندیمان پێوە بکەیت لە ڕێگەی{" "}
        <MailLink>tebin.faruq@gmail.com</MailLink>.
      </p>
    </>
  ),

  "data-retention": (
    <>
      <p>
        ئێمە داتاکانت تەنها بۆ ئەو ماوەیە دەهێڵینەوە کە پێویست بێت بۆ پێشکەشکردنی خزمەتگوزارییەکان یان پابەندبوون بە بەرپرسیاریەتییە
        یاساییەکانمان.
      </p>
      <p>
        کاتێک داوای سڕینەوەی هەژمار دەکەیت، لە ماوەیەکی گونجاودا زانیارییە کەسییەکانت دەسڕینەوە یان بێناسنامەیان دەکەین (Anonymize)،
        مەگەر یاسا پاراستنی بەشێکیان بە ناچاری بسەپێنێت.
      </p>
    </>
  ),

  "childrens-privacy": (
    <>
      <p>
        ئەم خزمەتگوزارییە بۆ منداڵان ئاراستە نەکراوە، و ئێمە بە هیچ جۆرێک بە ئاگادارییەوە زانیاری کەسانی خوار تەمەنی ١٣ ساڵ کۆناکەینەوە (یان
        تەمەنی یاسایی دیاریکراو لە ناوچەکەتدا).
      </p>
      <p>
        ئەگەر پێتوابوو منداڵێک زانیاری کەسی پێداوین، تکایە لە ڕێگەی ئیمەیڵی{" "}
        <MailLink>tebin.faruq@gmail.com</MailLink> ئاگادارمان بکەرەوە بۆ ئەوەی ڕێکاری خێرا بگرینەبەر بۆ سڕینەوەی ئەو زانیارییانە.
      </p>
    </>
  ),

  "international-transfers": (
    <>
      <p>
        لەوانەیە زانیارییەکانت لە وڵاتانێکی جیاواز لە وڵاتی نیشتەجێبوونت هەڵبگیرێن و پرۆسێس بکرێن، لە هەر شوێنێک کە دابینکەرانی خزمەتگوزاریمان
        (وەک Google/Firebase و Supabase) بنکە و سێرڤەری هەورییان هەبێت.
      </p>
      <p>
        کاتێک زانیارییەکانت دەگوازرێنەوە بۆ دەرەوەی وڵاتەکەت، ئێمە پشت بەو ڕێکارە یاسایی و ئەمنییانە دەبەستین کە ئەو کۆمپانیایانە دابینی
        دەکەن بۆ گواستنەوەی پارێزراوی نێودەوڵەتی. بە بەکارهێنانی ئەم ئەپە، تۆ ڕازی دەبیت بەم جۆرە گواستنەوەیە.
      </p>
    </>
  ),

  "account-deletion": (
    <>
      <p>
        دەتوانیت لە هەر کاتێکدا داوای سڕینەوەی هەژماری فرۆشیار و تەواوی زانیارییە کەسییەکانت بکەیت لە ڕێگەی ناردنی ئیمەیڵ بۆ{" "}
        <MailLink>tebin.faruq@gmail.com</MailLink> لە هەمان ئەو ناونیشانەی ئیمەیڵەی کە هەژمارەکەت پێ تۆمارکراوە.
      </p>
      <p>
        کاتێک داواکارییەکەت پشتڕاست دەکەینەوە، هەژمارەکەت و زانیارییە کەسییەکانت بە تەواوی دەسڕینەوە بەپێی ئەوەی لە بەشی{" "}
        <SectionAnchorLink href="#data-retention">ماوەی هێشتنەوەی داتا</SectionAnchorLink> ڕوونکراوەتەوە. هەروەها دەتوانیت داتای ناوخۆیی سەر
        ئامێرەکەت لە هەر ساتێکدا بسڕیتەوە بە سڕینەوەی ئەپەکە لەسەر ئامێرەکەت.
      </p>
    </>
  ),

  "third-party-links": (
    <>
      <p>
        لەوانەیە خزمەتگوزارییەکە بەستەری ماڵپەڕ یان خزمەتگوزارییەکانی تری لایەنی سێیەمی تێدابێت کە لەلایەن ئێمەوە بەڕێوەنابرێن. ئێمە بەرپرسیار
        نین لە ناوەڕۆک، سیاسەتی پاراستنی نهێنی یان مەرجەکانی ئەو ماڵپەڕانە. پێشنیارت بۆ دەکەین سیاسەتی تایبەتی ئەوانیش بخوێنیتەوە.
      </p>
    </>
  ),

  "changes-to-policy": (
    <>
      <p>
        لەوانەیە ناوبەناو ئەم سیاسەتی پاراستنی نهێنییە نوێ بکەینەوە. بەرواری &laquo;دواین نوێکردنەوە&raquo; لە بەشی سەرەوەی ئەم پەڕەیە
        کاتی ئەنجامدانی دەستکارییەکان نیشان دەدات و ئەو وەشانەی لێرە بڵاوکراوەتەوە هەمیشە وەشانی فەرمییە.
      </p>
      <p>
        ئەگەر گۆڕانکاری گرنگ و بنەڕەتی ئەنجام بدەین، لە ڕێگەی ئەپەکە یان ماڵپەڕەکەوە پێشوەختە ئاگادارتان دەکەینەوە. بەردەوامبوونت لە
        بەکارهێنانی فرۆشیار دوای جێبەجێبوونی گۆڕانکارییەکان، بە واتای ڕەزامەندیتە لەسەر سیاسەتە نوێکراوەکە.
      </p>
    </>
  ),

  "contact-information": (
    <>
      <p>ئەگەر هەر پرسیارێک یان سەرنجێکت هەیە سەبارەت بەم سیاسەتە یان چۆنیەتی مامەڵەکردن لەگەڵ زانیارییەکانت، پەیوەندیمان پێوە بکە:</p>
      <List
        items={[
          <>
            <strong className="text-ink dark:text-gold-300">براند:</strong> فرۆشیار (Froshiar)
          </>,
          <>
            <strong className="text-ink dark:text-gold-300">ماڵپەڕ:</strong>{" "}
            <ExternalLink href="https://www.froshiar.store">https://www.froshiar.store</ExternalLink>
          </>,
          <>
            <strong className="text-ink dark:text-gold-300">ئیمەیڵی پشتیوانی:</strong>{" "}
            <MailLink>tebin.faruq@gmail.com</MailLink>
          </>,
        ]}
      />
      <p>
        ئەگەر زانیارییەکانی پەیوەندیمان لە داهاتوودا بگۆڕدرێن، ئەم بەشە نوێ دەکەینەوە تا هەمیشە نوێترین ڕێگای پەیوەندی دیار بێت.
      </p>
    </>
  ),
};

export function getPrivacyBody(locale?: string): Record<PrivacySectionId, ReactNode> {
  return locale === "ckb" ? PRIVACY_BODY_CKB : PRIVACY_BODY_EN;
}

export const PRIVACY_BODY = PRIVACY_BODY_EN;
