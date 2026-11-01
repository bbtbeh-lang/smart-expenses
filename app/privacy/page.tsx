import { SUPPORT_EMAIL } from '@/lib/support';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto mb-4">
        <a
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
        >
          ← Back to FinSnap
        </a>
      </div>
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 p-8 prose prose-slate prose-sm">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">FinSnap Privacy Policy</h1>
        <p className="text-slate-400 text-xs mb-8">Last updated: October 2026</p>

        <p>
          FinSnap (“we”, “us”) is an expense and receipt tracking application operated from Ontario,
          Canada. This policy explains what personal information we collect, why, who handles it, how
          long we keep it, and the choices you have. We follow the principles of Canada’s{' '}
          <em>Personal Information Protection and Electronic Documents Act</em> (PIPEDA). If you have any
          question about your information, write to us at the address in section 11.
        </p>

        <h2>1. Information we collect</h2>
        <ul>
          <li><strong>Account information:</strong> your email address (from Google sign-in or the email link you request) and, if you choose to add it in Settings, your date of birth.</li>
          <li><strong>Financial information you enter:</strong> transactions, amounts, dates, merchants, categories, taxes, notes, budgets, custom categories and pricing-calculator entries.</li>
          <li><strong>Receipt photos:</strong> images you scan, and a short fingerprint of each image used to spot accidental duplicate scans.</li>
          <li><strong>Billing information:</strong> if you subscribe, payment is handled entirely by Stripe. We never see or store your card number. We keep your plan, subscription status and Stripe identifiers.</li>
          <li><strong>Usage information:</strong> how many receipts you have scanned in a billing period, so we can apply your plan’s limits.</li>
          <li><strong>Technical information:</strong> our hosting and sign-in providers keep standard technical logs, such as IP address, browser type and time of access.</li>
        </ul>

        <h2>2. Why we use it</h2>
        <p>
          We use your information to run FinSnap for you: to sign you in, store and show your records,
          read receipts, build your reports and exports, apply plan limits and process subscriptions. We
          also use it to keep the service secure, prevent abuse, answer support requests, and send
          service emails such as subscription renewal reminders. We do not sell your information and we
          do not use it for advertising.
        </p>

        <h2>3. How receipts are read by AI</h2>
        <p>
          When you scan a receipt, the photo is sent to an AI service provided by Anthropic, which
          returns the merchant, date, amounts, tax, items and a suggested category. We ask you to
          acknowledge this before your first scan. The photo is then saved in your private storage —
          accessible only to your account — as a convenience copy. AI can misread numbers, so always
          check the result against the paper receipt. Please do not scan documents that contain
          information you do not want processed this way.
        </p>

        <h2>4. Who handles your information, and where</h2>
        <p>We rely on these service providers to operate FinSnap. Each handles information only to provide its service to us:</p>
        <ul>
          <li><strong>Supabase</strong> — database, sign-in and file storage.</li>
          <li><strong>Anthropic</strong> — reading receipt photos (section 3).</li>
          <li><strong>Stripe</strong> — payments and subscriptions.</li>
          <li><strong>Netlify</strong> — hosting of the web application.</li>
          <li><strong>Resend</strong> — sending service emails.</li>
          <li><strong>Google</strong> — optional “Sign in with Google”.</li>
        </ul>
        <p>
          Some of these providers, or their servers, may be located outside Canada, including in the
          United States, so your information may be processed there and can be subject to the laws and
          access rights of those places. We may also disclose information when the law requires it.
        </p>

        <h2>5. How long we keep it</h2>
        <p>
          We keep your information while your account is active. If you delete your account, we delete
          your account data and saved receipt photos, except for records that a provider such as Stripe
          must keep by law, and copies that may remain briefly in provider backups, if any. We do not
          promise to keep receipt photos for any set period, so keep your own copies of anything you
          must retain.
        </p>

        <h2>6. Keeping it safe</h2>
        <p>
          We use established hosting, database and payment providers, encrypted connections (HTTPS), and
          access controls so that your records are visible only to your own account. No system is
          completely secure. If a security breach creates a real risk of significant harm to you, we
          will tell you and report it to the Office of the Privacy Commissioner of Canada as the law
          requires.
        </p>

        <h2>7. Your choices and rights</h2>
        <p>
          You may ask to see the personal information we hold about you, to correct it, to withdraw your
          consent to its use, or to have your account and data deleted — from Settings or by contacting
          us. Withdrawing consent may mean we can no longer provide some or all of the service. We aim
          to answer requests within 30 days.
        </p>

        <h2>8. Age</h2>
        <p>FinSnap is for people who are at least 18 years old. We do not knowingly collect information from anyone younger.</p>

        <h2>9. Local storage and cookies</h2>
        <p>
          FinSnap uses your browser’s local storage to keep the app responsive, to remember your
          language and settings, and to remember that you accepted our terms and the receipt-scanning
          notice on this device. Sign-in is managed with secure session tokens issued by Supabase. We do
          not use advertising or cross-site tracking cookies.
        </p>

        <h2>10. Questions and complaints</h2>
        <p>
          Please contact us first and we will try to resolve it. You also have the right to complain to
          the Office of the Privacy Commissioner of Canada (priv.gc.ca). If you live in Québec, you may
          also contact the Commission d’accès à l’information du Québec.
        </p>

        <h2>11. Contact and changes</h2>
        <p>
          Questions about this policy?{' '}
          {SUPPORT_EMAIL ? (
            <>Contact us at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</>
          ) : (
            <>Contact us through the support link in the app.</>
          )}{' '}
          We may update this policy. When a change is material we will tell you in the app or by email,
          and the “Last updated” date above will change.
        </p>
      </div>
    </div>
  );
}
