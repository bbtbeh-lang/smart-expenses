export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 p-8 prose prose-slate prose-sm">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">FinSnap Privacy Policy</h1>
        <p className="text-slate-400 text-xs mb-8">Last updated: July 2026</p>

        <p>
          FinSnap ("we", "our", "us") is a personal and small-business expense tracking
          application operated in Canada. This policy explains what information we collect,
          how we use it, and the choices you have.
        </p>

        <h2>1. Information we collect</h2>
        <ul>
          <li><strong>Account information:</strong> your email address, provided when you sign in with Google.</li>
          <li><strong>Financial data you enter:</strong> transactions, amounts, categories, dates, and any receipt photos you scan.</li>
          <li><strong>Payment information:</strong> if you subscribe to a paid plan, billing is handled entirely by Stripe. We never see or store your card number — we only receive your subscription status and plan.</li>
          <li><strong>Usage data:</strong> how many receipts you've scanned in a billing period, so we can enforce your plan's limits.</li>
        </ul>

        <h2>2. How receipt photos are processed and stored</h2>
        <p>
          When you scan a receipt, the photo is sent to Anthropic's Claude API to extract the
          merchant, date, amount, and line items. We also compute a fingerprint of the image to
          detect accidental duplicate scans. <strong>The receipt photo is then archived in your
          private storage</strong> — accessible only to your account — so you retain a copy for
          your own records, since tax authorities such as the CRA generally require supporting
          documents to be kept for several years. Archived receipts are permanently deleted if
          you delete your account.
        </p>

        <h2>3. Where your data is stored</h2>
        <p>
          Your account and transaction data are stored with Supabase (hosted in the cloud) with
          access restricted to your own account. Payment processing is handled by Stripe. We do
          not sell your data to third parties or use it for advertising.
        </p>

        <h2>4. Your rights</h2>
        <p>
          You can request a copy of your data or ask us to delete your account and all associated
          data at any time from Settings, or by contacting us. Under Canadian privacy law (PIPEDA),
          you have the right to access, correct, or withdraw consent for the use of your personal
          information, subject to legal or contractual retention requirements (e.g. Stripe's own
          record-keeping obligations for payments already processed).
        </p>

        <h2>5. Cookies and local storage</h2>
        <p>
          FinSnap uses your browser's local storage to keep the app responsive offline and to
          remember your language preference. Authentication is managed via secure, signed session
          tokens issued by Supabase.
        </p>

        <h2>6. Changes to this policy</h2>
        <p>We may update this policy from time to time. Material changes will be reflected by the "Last updated" date above.</p>

        <h2>7. Contact</h2>
        <p>Questions about this policy? Contact us through the support link in the app.</p>

        <p className="text-xs text-slate-400 mt-8 border-t border-slate-100 pt-4">
          This document is a plain-language summary provided for transparency and does not
          constitute formal legal advice. FinSnap recommends having this policy reviewed by a
          qualified lawyer before relying on it for compliance purposes.
        </p>
      </div>
    </div>
  );
}
