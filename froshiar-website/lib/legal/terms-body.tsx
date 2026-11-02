import type { ReactNode } from "react";
import type { TermsSectionId } from "./terms-sections";
import { ExternalLink, SectionAnchorLink, MailLink, List } from "./legal-ui";

export const TERMS_BODY_EN: Record<TermsSectionId, ReactNode> = {
  acceptance: (
    <>
      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of Froshiar (&ldquo;Froshiar,&rdquo;
        &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), a business management platform available on
        Android, iOS, and the web at <ExternalLink href="https://www.froshiar.store">www.froshiar.store</ExternalLink>{" "}
        (together, the &ldquo;Service&rdquo;).
      </p>
      <p>
        By downloading, installing, accessing, or using the Service, you agree to be bound by these Terms. If you
        do not agree to these Terms, do not use the Service. Your use of the Service is also governed by our{" "}
        <SectionAnchorLink href="/privacy">Privacy Policy</SectionAnchorLink>, which explains how we collect and
        handle information.
      </p>
    </>
  ),

  eligibility: (
    <>
      <p>
        You may use the Service only if you are capable of forming a legally binding contract. If you are using
        the Service on behalf of a business, you represent that you have the authority to bind that business to
        these Terms, and &ldquo;you&rdquo; in these Terms refers to both you individually and that business.
      </p>
      <p>
        The Service is intended for business use and is not directed to children. See our{" "}
        <SectionAnchorLink href="/privacy#childrens-privacy">Children&rsquo;s Privacy</SectionAnchorLink> section
        for more detail.
      </p>
    </>
  ),

  "user-accounts": (
    <>
      <p>
        Froshiar accounts are created and accessed exclusively through Google Sign-In, handled via Firebase
        Authentication. We do not offer email/password accounts. You are responsible for all activity that
        occurs under your account.
      </p>
      <p>
        You must provide accurate information when it is requested by the Service and keep your Google account
        secure, as described in <SectionAnchorLink href="#security-responsibilities">Security Responsibilities</SectionAnchorLink>{" "}
        below.
      </p>
    </>
  ),

  "business-accounts": (
    <>
      <p>
        The business data you enter into the Service — such as products, sales, purchases, inventory, customers,
        suppliers, expenses, and reports — belongs to you or the business you represent. You are responsible for
        the accuracy, legality, and completeness of that data.
      </p>
      <p>
        If more than one person accesses the Service on behalf of the same business, that business is
        responsible for ensuring each person&rsquo;s use of the Service complies with these Terms.
      </p>
    </>
  ),

  "acceptable-use": (
    <>
      <p>
        You agree to use the Service only for lawful business purposes and in the ways it is intended to be used
        — to manage sales, purchases, inventory, customers, suppliers, expenses, reports, business analytics,
        online store listings, and related business operations.
      </p>
      <p>
        You are responsible for ensuring your use of the Service complies with the laws and regulations that
        apply to your business, including those relating to commerce, taxation, and consumer protection.
      </p>
    </>
  ),

  "prohibited-activities": (
    <>
      <p>You agree not to:</p>
      <List
        items={[
          "Reverse engineer, decompile, or disassemble the Service, except to the extent such restriction is prohibited by applicable law.",
          "Circumvent, disable, or attempt to bypass any license, subscription, or usage-limit enforcement mechanism in the Service.",
          "Interfere with or disrupt the integrity or performance of the Service or the infrastructure of our service providers.",
          "Attempt to gain unauthorized access to another user's account, business data, or any part of the Service not intended for you.",
          "Upload or publish unlawful, fraudulent, or infringing content through the Online Store or any other part of the Service.",
          "Impersonate any person or entity, or misrepresent your affiliation with any person or entity.",
          "Use the Service to violate the rights of any third party, including intellectual property or data protection rights.",
        ]}
      />
    </>
  ),

  "customer-data": (
    <>
      <p>
        The Service allows you to store information about your own customers, suppliers, and employees. As
        between you and Froshiar, you are responsible for that data and for having a lawful basis to collect and
        process it. Froshiar processes this data only to provide the Service to you, as described in our{" "}
        <SectionAnchorLink href="/privacy#business-customer-data">Privacy Policy</SectionAnchorLink>.
      </p>
      <p>
        You are responsible for complying with any data protection or privacy obligations that apply to you in
        connection with the personal data of your own customers, suppliers, or employees that you enter into the
        Service.
      </p>
    </>
  ),

  "intellectual-property": (
    <>
      <p>
        The Froshiar name, logo, software, website, and related materials are owned by Froshiar or its
        licensors and are protected by applicable intellectual property laws. These Terms do not grant you any
        ownership rights in the Service, other than the limited license described in{" "}
        <SectionAnchorLink href="#software-license">Software License</SectionAnchorLink> below.
      </p>
      <p>
        The business data and content you enter into the Service remains yours. We do not claim ownership over
        it.
      </p>
    </>
  ),

  "software-license": (
    <>
      <p>
        Subject to your compliance with these Terms, Froshiar grants you a limited, non-exclusive,
        non-transferable, revocable license to install and use the Froshiar app on your devices, and to access
        the Froshiar website and web app, solely for your own internal business purposes.
      </p>
      <p>
        You may not sublicense, sell, rent, lease, or otherwise transfer this license to any third party. This
        license automatically terminates if you violate these Terms or if we discontinue the Service.
      </p>
    </>
  ),

  "online-store-services": (
    <>
      <p>
        The Online Store lets you publish selected products from your inventory to a public storefront that
        your own customers can browse. You are solely responsible for the accuracy of the products, prices,
        descriptions, and images you publish, and for complying with any advertising or consumer-protection laws
        that apply to your business.
      </p>
      <p>
        Froshiar does not process payments or handle order fulfillment through the Online Store. Any transaction
        between you and your customers takes place outside the Service, and you are solely responsible for
        completing it. Using the Online Store requires an active Online Store Subscription; see{" "}
        <SectionAnchorLink href="#subscriptions-and-paid-services">
          Subscriptions and Future Paid Services
        </SectionAnchorLink>{" "}
        below.
      </p>
    </>
  ),

  "subscriptions-and-paid-services": (
    <>
      <p>
        The core Service is currently available at no charge, subject to certain usage limits (such as
        inventory item limits). Some features, including the Online Store, currently require a separately
        issued paid subscription code, obtained by contacting <MailLink>tebin.faruq@gmail.com</MailLink> and
        activated within the Service on a specific device.
      </p>
      <p>
        Codes are issued for use on the device(s) they are activated on and are not transferable except as we
        may permit. We may introduce pricing, subscription plans, or other paid services for any part of the
        Service in the future, or change existing ones. Where we do, we will communicate the applicable terms
        before they take effect.
      </p>
    </>
  ),

  "availability-of-services": (
    <>
      <p>
        Froshiar is offline-first: core features remain available on your device without an internet
        connection. Google Sign-In, Cloud Synchronization, and the Online Store require an internet connection
        and depend on the continued availability of our service providers.
      </p>
      <p>
        We do not guarantee that the Service will be uninterrupted, timely, or error-free. We may modify,
        suspend, or discontinue any part of the Service, including experimental or opt-in features, at any
        time, and will provide reasonable notice where practical.
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
        The Service&rsquo;s availability depends in part on these providers. We are not responsible for outages,
        changes, or interruptions caused by a third-party service provider.
      </p>
    </>
  ),

  "user-responsibilities": (
    <>
      <p>You are responsible for:</p>
      <List
        items={[
          "The accuracy and lawfulness of the data you enter into the Service.",
          "Complying with the laws applicable to your business, including tax, consumer protection, and data protection laws.",
          "Obtaining any consents required from your own customers, suppliers, or employees before entering their information into the Service.",
          "Keeping your account and business information up to date.",
        ]}
      />
    </>
  ),

  "security-responsibilities": (
    <>
      <p>
        You are responsible for keeping your Google account credentials and your devices secure, since Froshiar
        is offline-first and your business data is stored on your device by default. You are also responsible
        for keeping any license or subscription codes issued to you confidential.
      </p>
      <p>
        No method of transmission over the internet or electronic storage is completely secure. If you suspect
        unauthorized access to your account, contact us immediately at{" "}
        <MailLink>tebin.faruq@gmail.com</MailLink>.
      </p>
    </>
  ),

  "suspension-and-termination": (
    <>
      <p>
        We may suspend or terminate your access to the Service if you violate these Terms, engage in any
        prohibited activity, or as required by law. You may stop using the Service at any time.
      </p>
      <p>
        Uninstalling the app removes locally stored data from that device but does not, by itself, delete data
        already synced to the cloud. To request deletion of your account and associated data, follow the process
        described in the Privacy Policy&rsquo;s{" "}
        <SectionAnchorLink href="/privacy#account-deletion">Account Deletion</SectionAnchorLink> section.
      </p>
      <p>
        Provisions of these Terms that by their nature should survive termination — including{" "}
        <SectionAnchorLink href="#intellectual-property">Intellectual Property</SectionAnchorLink>,{" "}
        <SectionAnchorLink href="#indemnification">Indemnification</SectionAnchorLink>, and{" "}
        <SectionAnchorLink href="#limitation-of-liability">Limitation of Liability</SectionAnchorLink> — will
        survive.
      </p>
    </>
  ),

  "disclaimer-of-warranties": (
    <>
      <p>
        To the maximum extent permitted by applicable law, the Service is provided &ldquo;as is&rdquo; and
        &ldquo;as available,&rdquo; without warranties of any kind, whether express, implied, or statutory,
        including implied warranties of merchantability, fitness for a particular purpose, and non-infringement.
      </p>
      <p>
        We do not warrant that the Service will be uninterrupted, error-free, or that any defects will be
        corrected. You are responsible for maintaining independent backups of any critical business data.
      </p>
    </>
  ),

  "limitation-of-liability": (
    <>
      <p>
        To the maximum extent permitted by applicable law, Froshiar will not be liable for any indirect,
        incidental, consequential, special, or exemplary damages, or for any loss of profits, revenue, data, or
        business, arising out of or in connection with your use of the Service.
      </p>
      <p>
        To the maximum extent permitted by applicable law, our aggregate liability arising out of or relating to
        these Terms or the Service will not exceed the amount, if any, you paid us for the Service in the twelve
        (12) months preceding the event giving rise to the claim.
      </p>
    </>
  ),

  indemnification: (
    <>
      <p>
        You agree to indemnify and hold Froshiar harmless from any claims, damages, liabilities, and expenses
        (including reasonable legal fees) arising out of or related to your use of the Service, your violation
        of these Terms, your violation of any law or third-party right, or the data you enter into the Service.
      </p>
    </>
  ),

  "updates-to-terms": (
    <>
      <p>
        We may update these Terms from time to time. The &ldquo;Last updated&rdquo; date at the top of this page
        indicates when it was last revised, and the version published here is always the authoritative one.
      </p>
      <p>
        If we make material changes, we will provide notice through the app, our website, or by other reasonable
        means before the changes take effect. Your continued use of the Service after a change becomes effective
        constitutes acceptance of the revised Terms.
      </p>
    </>
  ),

  "contact-information": (
    <>
      <p>If you have any questions about these Terms, contact us:</p>
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
    </>
  ),
};

export const TERMS_BODY_CKB: Record<TermsSectionId, ReactNode> = {
  acceptance: (
    <>
      <p>
        ئەم مەرجانەی بەکارهێنان (&laquo;مەرجەکان&raquo;) حوکمی دەستگەیشتن و بەکارهێنانی سیستەمی فرۆشیار (&laquo;فرۆشیار&raquo;،
        &laquo;ئێمە&raquo;، یان &laquo;تایبەت بە ئێمە&raquo;) دەکەن، کە پلاتفۆرمێکی بەڕێوەبردنی فرۆشگا و کارە لەسەر ئەندرۆید، ئایفۆن (iOS)
        و لە ڕێگەی وێبەوە لە{" "}
        <ExternalLink href="https://www.froshiar.store">www.froshiar.store</ExternalLink> (پێکەوە: &laquo;خزمەتگوزاری&raquo;).
      </p>
      <p>
        بە داگرتن، دابەزاندن، دەستگەیشتن، یان هەر جۆرە بەکارهێنانێکی ئەم خزمەتگوزارییە، تۆ ڕازی دەبیت بە پابەندبوون بە تەواوی ئەم مەرجانە.
        ئەگەر بەم مەرجانە ڕازی نیت، تکایە خزمەتگوزارییەکە بەکارمەهێنە. هەروەها بەکارهێنانی ئەم ئەپە بەپێی{" "}
        <SectionAnchorLink href="/privacy">سیاسەتی پاراستنی نهێنی</SectionAnchorLink>ی ئێمەش بەڕێوەدەچێت، کە ڕوونی دەکاتەوە چۆن زانیارییەکان
        کۆدەکەینەوە و دەیانپارێزین.
      </p>
    </>
  ),

  eligibility: (
    <>
      <p>
        تۆ دەتوانیت خزمەتگوزارییەکە بەکاربهێنیت تەنها ئەگەر توانای یاساییت هەبێت بۆ بەستنی گرێبەستێکی پابەندکەر. ئەگەر بە ناوی کۆمپانیا،
        فرۆشگا، یان کارێکەوە خزمەتگوزارییەکە بەکاردەهێنیت، تۆ نوێنەرایەتی ئەوە دەکەیت کە دەسەڵاتی تەواوت هەیە ئەو کارە بەم مەرجانە پابەند
        بکەیت، و وشەی &laquo;تۆ&raquo; لەم دەقەدا ئاماژەیە بۆ تۆ بە شێوەی کەسی و بۆ ئەو کارە بازرگانییەش.
      </p>
      <p>
        ئەم خزمەتگوزارییە بۆ مەبەستی بەڕێوەبردنی کار دانراوە و بۆ منداڵان ئاراستە نەکراوە. بڕوانە بەشی{" "}
        <SectionAnchorLink href="/privacy#childrens-privacy">پاراستنی تایبەتمەندی منداڵان</SectionAnchorLink> بۆ زانیاری زیاتر.
      </p>
    </>
  ),

  "user-accounts": (
    <>
      <p>
        هەژمارەکانی فرۆشیار بە شێوەیەکی فەرمی تەنها لە ڕێگەی چوونەژوورەوەی گووگڵ (Google Sign-In) لە ڕێگەی ژێرخانی Firebase دروست دەکرێن و
        بەکاریدەهێنرێن. ئێمە هەژماری ناوی بەکارهێنەر و وشەی نهێنی سەربەخۆ پێشکەش ناکەین. تۆ بە تەواوی بەرپرسیاری لە هەر چالاکییەک کە لەژێر
        هەژمارەکەتدا ئەنجام دەدرێت.
      </p>
      <p>
        پێویستە زانیاری دروست پێشکەش بکەیت و هەژماری گووگڵەکەت بە پارێزراوی بهێڵیتەوە، وەک لە بەشی{" "}
        <SectionAnchorLink href="#security-responsibilities">بەرپرسیاریەتییەکانی ئاسایش</SectionAnchorLink> ڕوونکراوەتەوە.
      </p>
    </>
  ),

  "business-accounts": (
    <>
      <p>
        تەواوی ئەو داتایەی تۆ بۆ کارەکەت تۆماری دەکەیت — وەک کاڵاکان، نرخەکان، فرۆشتن، کڕین، کۆگا، کڕیاران، دابینکەران، خەرجییەکان و
        ڕاپۆرتەکان — بە تەواوی موڵکی تۆیە یان موڵکی ئەو کارەیە کە نوێنەرایەتی دەکەیت. تۆ بەرپرسیاری لە دروستی، تەواوی و یاسایی بوونی
        ئەو داتایانە.
      </p>
      <p>
        ئەگەر زیاتر لە یەک کەس لە ئامێری جیاوازەوە دەستی بگات بە هەمان هەژماری کارەکەت، کارەکەت بەرپرسیارە لەوەی بەکارهێنانی هەریەکەیان بەپێی
        ئەم مەرجانە بێت.
      </p>
    </>
  ),

  "acceptable-use": (
    <>
      <p>
        تۆ ڕازی دەبیت کە خزمەتگوزارییەکە تەنها بۆ مەبەستی یاسایی کار و بەو شێوازانەی کە بۆی دیزاین کراوە بەکاربهێنیت — بۆ بەڕێوەبردنی
        فرۆشتن، کڕین، کۆگا، کڕیاران، دابینکەران، خەرجییەکان، ڕاپۆرتە داراییەکان، شیکاری کار، لیستی کاڵاکانی فرۆشگای ئۆنلاین و پرۆسە بازرگانییە
        پەیوەندیدارەکان.
      </p>
      <p>
        تۆ بەرپرسیاری لەوەی کە بەکارهێنانی خزمەتگوزارییەکە لەگەڵ یاسا و ڕێساکانی بازاڕ و بازرگانی ناوچەکەتدا بگونجێت، لەوانە یاساکانی
        باج و پاراستنی مافی بەکاربەر.
      </p>
    </>
  ),

  "prohibited-activities": (
    <>
      <p>تۆ ڕازی دەبیت کە بە هیچ جۆرێک ئەم کردەوانە ئەنجام نەدەیت:</p>
      <List
        items={[
          "هەڵوەشاندنەوە، ئەندازیاری پێچەوانە (Reverse Engineer)، یان هەوڵدان بۆ دۆزینەوەی کۆدی سەرچاوەی بەرنامەکە.",
          "تێپەڕاندن یان هەوڵدان بۆ شکاندنی سیستەمی مۆڵەت، کۆدی بەشداریکردن، یان سنووردارکردنەکانی بەکارهێنان لە ئەپەکەدا.",
          "دەستکاریکردن یان تێکدانی سەقامگیری و کارکردنی خزمەتگوزارییەکە یان ژێرخانی سێرڤەرەکانی دابینکەرانی خزمەتگوزاریمان.",
          "هەوڵدان بۆ دەستگەیشتنی ڕێپێنەدراو بە هەژمار یان داتای کەسانی تر، یان بەشەکانی تری سیستەمەکە کە بۆ تۆ دیاری نەکراون.",
          "بارکردن یان بڵاوکردنەوەی هەر ناوەڕۆکێکی نایاسایی، ساختە، یان پێشێلکاری مافی کەسانی تر لە ڕێگەی فرۆشگای ئۆنلاینەوە.",
          "خۆنواندن بە ناوی کەسایەتی یان کۆمپانیای تر، یان چەواشەکردنی ناسنامە.",
          "بەکارهێنانی سیستەمەکە بۆ پێشێلکردنی مافی هیچ لایەنێکی سێیەم، لەوانە مافی خاوەندارێتی هزری و پاراستنی داتا.",
        ]}
      />
    </>
  ),

  "customer-data": (
    <>
      <p>
        خزمەتگوزارییەکە ڕێگەت پێدەدات زانیاری کڕیارەکانت، دابینکەران و کارمەندەکانت تۆمار بکەیت. لەنێوان تۆ و فرۆشیاردا، تۆ خاوەن و
        بەرپرسیاری تەواوی ئەو داتایەی و بەرپرسیاری لە هەبوونی بنەمای دروست بۆ تۆمارکردنیان. فرۆشیار تەنها بۆ پێشکەشکردنی ئەم خزمەتگوزارییە
        ئەو داتایە پرۆسێس دەکات، وەک لە{" "}
        <SectionAnchorLink href="/privacy#business-customer-data">سیاسەتی پاراستنی نهێنی</SectionAnchorLink>دا ڕوونکراوەتەوە.
      </p>
      <p>
        تۆ بەرپرسیاری لە جێبەجێکردنی هەر ڕێکارێکی یاسایی پەیوەست بە پاراستنی داتای کەسی کڕیاران و دابینکەرەکانت کە تۆماریان دەکەیت.
      </p>
    </>
  ),

  "intellectual-property": (
    <>
      <p>
        ناوی فەرمی فرۆشیار، لۆگۆ، ئەپڵیکەیشن، ماڵپەڕ، دیزاین و کەرەستە پەیوەندیدارەکان موڵکی فرۆشیارن و بە یاساکانی خاوەندارێتی هزری
        پارێزراون. ئەم مەرجانە هیچ مافێکی خاوەندارێتی لەم ئەپە پێت نادەن، جگە لەو مۆڵەتە سنووردارەی لە بەشی{" "}
        <SectionAnchorLink href="#software-license">مۆڵەتی بەکارهێنانی بەرنامە</SectionAnchorLink>دا باسکراوە.
      </p>
      <p>
        داتای کارەکەت و ئەو ناوەڕۆکەی لە ئەپەکەدا تۆماری دەکەیت هەمیشە وەک موڵکی تەواوی خۆت دەمێنێتەوە و ئێمە هیچ داوای خاوەندارێتی لێ ناکەین.
      </p>
    </>
  ),

  "software-license": (
    <>
      <p>
        بە مەرجی پابەندبوونت بەم مەرجانەی بەکارهێنان، فرۆشیار مۆڵەتێکی سنووردار، ناتایبەت، نەگوازراوە و هەڵوەشێنەرەوەت پێدەبەخشێت بۆ
        دابەزاندن و بەکارهێنانی ئەپی فرۆشیار لەسەر ئامێرەکانت، و چوونە ناو وێب ئەپەکە تەنها بۆ مەبەستی بەڕێوەبردنی کاری ناوخۆیی فرۆشگاکەت.
      </p>
      <p>
        بۆت نییە ئەم مۆڵەتە بە کەسی تر بفرۆشیتەوە، بە کرێی بدەیت، یان بیبەخشیت. ئەم مۆڵەتە خۆکارانە هەڵدەوەشێتەوە ئەگەر ئەم مەرجانە پێشێل
        بکەیت یان ئەگەر پێشکەشکردنی خزمەتگوزارییەکە ڕابگرین.
      </p>
    </>
  ),

  "online-store-services": (
    <>
      <p>
        خزمەتگوزاری فرۆشگای ئۆنلاین ڕێگەت پێدەدات بە یەک کلیک کاڵا هەڵبژێردراوەکانی کۆگاکەت لە فرۆشگایەکی گشتی ئۆنلایندا بڵاوبکەیتەوە تا
        کڕیارەکانت بیبینن و داواکاری بنێرن. تۆ بە تەواوی بەرپرسیاری لە دروستی نرخەکان، کاڵاکان، وەسف و وێنەکان، و پابەندبوون بە یاساکانی
        ڕیکلام و پاراستنی مافی بەکاربەر.
      </p>
      <p>
        فرۆشیار پارەدان و گەیاندنی داواکارییەکان لە فرۆشگای ئۆنلاین ئەنجام نادات؛ هەر مامەڵەیەک لەنێوان تۆ و کڕیارەکانتدا لە دەرەوەی
        ئەم سیستەمە ئەنجام دەدرێت و خۆت بەرپرسیاری لە جێبەجێکردنی. بەکارهێنانی فرۆشگای ئۆنلاین پێویستی بە بەشداریکردنی چالاک هەیە؛ بڕوانە بەشی{" "}
        <SectionAnchorLink href="#subscriptions-and-paid-services">
          بەشداریکردن و خزمەتگوزارییە پارەپێدراوەکان
        </SectionAnchorLink>{" "}
        لە خوارەوە.
      </p>
    </>
  ),

  "subscriptions-and-paid-services": (
    <>
      <p>
        بەشە سەرەکییەکانی خزمەتگوزاری فرۆشیار لە ئێستادا بەبێ بەرامبەر بەردەستن بەپێی هەندێک سنووری بەکارهێنان (وەک ژمارەی کاڵاکانی کۆگا).
        هەندێک تایبەتمەندی تایبەت، لەوانە فرۆشگای ئۆنلاین، پێویستیان بە کۆدی بەشداریکردنی چالاک هەیە کە لە ڕێگەی پەیوەندیکردن بە{" "}
        <MailLink>tebin.faruq@gmail.com</MailLink> وەردەگیرێت و لەسەر ئامێرێکی دیاریکراو چالاک دەکرێت.
      </p>
      <p>
        کۆدەکان تایبەتن بەو ئامێرەی کە لێی چالاک کراون و ناگوازرێنەوە مەگەر بە ڕەزامەندی ئێمە بێت. لەوانەیە لە داهاتوودا پلانی بەشداریکردن یان
        نرخی نوێ بۆ هەر بەشێکی خزمەتگوزارییەکە دابنێین یان دەستکارییان بکەین. لە کاتی ئەنجامدانی هەر گۆڕانکارییەکدا، پێشوەختە مەرجە نوێیەکان
        ڕادەگەیەنین.
      </p>
    </>
  ),

  "availability-of-services": (
    <>
      <p>
        فرۆشیار لە بنەڕەتدا بە شێوازی کارکردنی ئۆفلاین دروستکراوە: زۆربەی تایبەتمەندییە سەرەکییەکان لەسەر ئامێرەکەت بەردەوام دەبن بەبێ
        هەبوونی هێڵی ئینتەرنێت. بەڵام چوونەژوورەوەی گووگڵ، هاوکاتکردنی هەوری و فرۆشگای ئۆنلاین پێویستیان بە ئینتەرنێت هەیە.
      </p>
      <p>
        ئێمە گەرەنتی ئەوە ناکەین کە سیستەمەکە هەمیشە و بێ پچڕان یان بێ هیچ کێشەیەک بەردەوام بێت. لەوانەیە هەر بەشێکی خزمەتگوزارییەکە نوێ
        بکەینەوە، ڕایبگرین یان کۆتایی پێبهێنین، و ئاگاداری گونجاو پێشکەش دەکەین لە کاتی گونجاودا.
      </p>
    </>
  ),

  "third-party-services": (
    <>
      <p>سیستەمی فرۆشیار بۆ کارکردنی پشت بەم دابینکەرە نێودەوڵەتییانە دەبەستێت:</p>
      <List
        items={[
          <>
            <strong className="text-ink dark:text-gold-300">Google / Firebase</strong> &mdash; بۆ چوونەژوورەوەی پارێزراوی گووگڵ. بڕوانە{" "}
            <ExternalLink href="https://policies.google.com/privacy">سیاسەتی پاراستنی نهێنی گووگڵ</ExternalLink>.
          </>,
          <>
            <strong className="text-ink dark:text-gold-300">Supabase</strong> &mdash; بۆ هەڵگرتن و هاوکاتکردنی هەوری. بڕوانە{" "}
            <ExternalLink href="https://supabase.com/privacy">سیاسەتی پاراستنی نهێنی Supabase</ExternalLink>.
          </>,
        ]}
      />
      <p>
        بەردەستبوونی بەشێکی خزمەتگوزارییە هەورییەکان پەیوەستە بەم دابینکەرانەوە. ئێمە بەرپرسیار نین لە هەر پچڕان یان لەکارکەوتنێک کە بەهۆی
        سێرڤەری لایەنی سێیەمەوە دروست ببێت.
      </p>
    </>
  ),

  "user-responsibilities": (
    <>
      <p>تۆ وەک بەکارهێنەر بەرپرسیاری لەمانەی خوارەوە:</p>
      <List
        items={[
          "دروستی، پاکی و یاسایی بوونی تەواوی ئەو داتایەی تۆماری دەکەیت لە سیستەمەکەدا.",
          "پابەندبوون بە یاسا پەیوەندیدارەکانی کارەکەت، لەوانە یاساکانی باج، کڕین و فرۆشتن و پاراستنی داتا.",
          "وەرگرتنی ڕەزامەندی پێویست لە کڕیاران یان کارمەندەکانت پێش تۆمارکردنی زانیارییەکانیان.",
          "نوێ ڕاگرتنی بەردەوامی زانیارییەکانی پەیوەندی و هەژمارەکەت.",
        ]}
      />
    </>
  ),

  "security-responsibilities": (
    <>
      <p>
        تۆ بەرپرسیاری لە پاراستنی ئامێرەکەت و هەژماری گووگڵەکەت، چونکە فرۆشیار ئۆفلاین کاردەکات و داتاکانت بە شێوەی بنەڕەتی لەسەر ئامێرەکەت
        هەڵدەگیرێن. هەروەها بەرپرسیاری لە پاراستنی نهێنی هەر کۆدێکی بەشداریکردن کە پێت دەدرێت.
      </p>
      <p>
        هیچ شێوازێکی پەیوەندی ئەلیکترۆنی ١٠٠٪ پارێزراو نییە. ئەگەر هەستت بە هەر دەستگەیشتنێکی گوماناوی کرد بۆ سەر هەژمارەکەت، دەستبەجێ
        ئاگادارمان بکەرەوە لە ڕێگەی <MailLink>tebin.faruq@gmail.com</MailLink>.
      </p>
    </>
  ),

  "suspension-and-termination": (
    <>
      <p>
        ئێمە مافی ئەوەمان هەیە دەستگەیشتنت بە خزمەتگوزارییەکە ڕابگرین ئەگەر ئەم مەرجانە پێشێل بکەیت، هەر کردەوەیەکی قەدەغەکراو ئەنجام بدەیت، یان
        ئەگەر یاسا داوای بکات. تۆش دەتوانیت لە هەر ساتێکدا بەکارهێنانی فرۆشیار ڕابگریت.
      </p>
      <p>
        سڕینەوەی ئەپەکە داتای سەر ئەو ئامێرە دەسڕێتەوە، بەڵام داتای ناو هەور ناسڕێتەوە؛ بۆ داواکردنی سڕینەوەی تەواوەتی هەژمار و داتاکانت،
        بڕوانە بەشی{" "}
        <SectionAnchorLink href="/privacy#account-deletion">سڕینەوەی هەژمار</SectionAnchorLink> لە سیاسەتی پاراستنی نهێنیدا.
      </p>
      <p>
        تەواوی ئەو بڕگانەی کە بە سروشتی خۆیان پێویستە بمێننەوە — لەوانە{" "}
        <SectionAnchorLink href="#intellectual-property">مافی خاوەندارێتی هزری</SectionAnchorLink>،{" "}
        <SectionAnchorLink href="#indemnification">قەرەبووکردنەوە و بێبەریبوون</SectionAnchorLink>، و{" "}
        <SectionAnchorLink href="#limitation-of-liability">سنووردارکردنی بەرپرسیاریەتی</SectionAnchorLink> — دوای ڕاگرتنیش بەردەوام
        دەبن.
      </p>
    </>
  ),

  "disclaimer-of-warranties": (
    <>
      <p>
        تا ئەو پەڕی سنووری ڕێگەپێدراو بەپێی یاسا، ئەم خزمەتگوزارییە بە شێوازی &laquo;وەک خۆی&raquo; (&ldquo;as is&rdquo;) و &laquo;وەک
        بەردەستبوونی ئێستای&raquo; (&ldquo;as available&rdquo;) پێشکەش دەکرێت، بەبێ هیچ جۆرە گەرەنتییەکی ڕاشکاو یان ناڕاستەوخۆ.
      </p>
      <p>
        ئێمە گەرەنتی ئەوە ناکەین کە سیستەمەکە بێ هەڵە بێت یان هەموو هەڵەیەک دەستبەجێ چارەسەر بکرێت. تۆ خۆت بەرپرسیاری لە پاراستنی یەدەگی
        سەربەخۆ لە داتای کارەکەت.
      </p>
    </>
  ),

  "limitation-of-liability": (
    <>
      <p>
        تا ئەو پەڕی سنووری ڕێگەپێدراو بەپێی یاسا، فرۆشیار بەرپرسیار نابێت لە هیچ زیانێکی ناڕاستەوخۆ، لەدەستچوونی قازانج، داهات، داتا، یان
        کاری بازرگانی کە لە ئەنجامی بەکارهێنان یان نەتوانینی بەکارهێنانی ئەم خزمەتگوزارییەوە دروست دەبێت.
      </p>
      <p>
        تەواوی بەرپرسیاریەتی دارایی ئێمە بۆ هەر داوایەکی پەیوەندیدار بەم مەرجانە، لە هیچ بارێکدا لەو بڕە پارەیە زیاتر نابێت کە تۆ لە ماوەی
        ١٢ مانگی ڕابردوودا بە ئێمەت داوە بۆ بەکارهێنانی خزمەتگوزارییەکە.
      </p>
    </>
  ),

  indemnification: (
    <>
      <p>
        تۆ ڕازی دەبیت بە قەرەبووکردنەوە، پاراستن و بێبەریڕاگرتنی فرۆشیار لە هەر داواکاری، زیان، و خەرجییەکی یاسایی کە لە ئەنجامی
        بەکارهێنانی ئەپەکە، پێشێلکردنی ئەم مەرجانە، پێشێلکردنی مافی کەسانی تر، یان ئەو داتایەی لە ئەپەکەدا تۆماری دەکەیت، دروست دەبێت.
      </p>
    </>
  ),

  "updates-to-terms": (
    <>
      <p>
        لەوانەیە ناوبەناو ئەم مەرجانە نوێ بکەینەوە. بەرواری &laquo;دواین نوێکردنەوە&raquo; کاتی دەستکارییەکان نیشان دەدات و ئەو وەشانەی لەم
        پەڕەیەدا بڵاوکراوەتەوە هەمیشە وەشانی فەرمییە.
      </p>
      <p>
        ئەگەر گۆڕانکاری گرنگ ئەنجام بدەین، لە ڕێگەی ئەپەکە یان ماڵپەڕەکەوە ئاگادارتان دەکەینەوە پێش جێبەجێبوونیان. بەردەوامبوونت لە
        بەکارهێنانی فرۆشیار بە واتای ڕەزامەندیتە لەسەر مەرجە نوێکراوەکان.
      </p>
    </>
  ),

  "contact-information": (
    <>
      <p>ئەگەر هەر پرسیارێکت هەیە سەبارەت بەم مەرجانەی بەکارهێنان، دەتوانیت پەیوەندیمان پێوە بکەیت لە ڕێگەی:</p>
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
    </>
  ),
};

export function getTermsBody(locale?: string): Record<TermsSectionId, ReactNode> {
  return locale === "ckb" ? TERMS_BODY_CKB : TERMS_BODY_EN;
}

export const TERMS_BODY = TERMS_BODY_EN;
