export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 p-8 prose prose-slate prose-sm">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">FinSnap Terms of Service</h1>
        <p className="text-slate-400 text-xs mb-8">Last updated: July 2026</p>

        <h2>1. The service</h2>
        <p>
          FinSnap is an expense-tracking application that lets you record transactions manually
          or by scanning receipts, which are processed using AI to extract merchant, date, amount,
          and item details. FinSnap is provided "as is" and we make no guarantee that extracted
          data will always be 100% accurate — please review scanned entries before relying on them.
        </p>

        <h2>2. Not financial or tax advice</h2>
        <p>
          FinSnap helps you organize your own financial records. It does not calculate final
          GST/HST/QST remittance amounts, provide accounting advice, or replace a professional
          accountant or bookkeeper. Any totals, summaries, or tax-related figures shown in the app
          are derived only from the data you entered and should be verified with a qualified
          professional before being used for tax filings or business decisions.
        </p>

        <h2>3. Subscriptions and billing</h2>
        <ul>
          <li>Paid plans (Basic, Pro, Business) are billed monthly or yearly through Stripe.</li>
          <li>Each plan includes a monthly receipt-scan allowance; scanning (OCR) is only available on paid plans.</li>
          <li>You can cancel, upgrade, or downgrade your subscription at any time from the "Manage Subscription" option, which opens Stripe's secure billing portal.</li>
          <li>Except where required by law, payments already processed are non-refundable, but you will retain access to your current plan until the end of the paid period after cancelling.</li>
        </ul>

        <h2>4. Acceptable use</h2>
        <p>
          You agree not to misuse the service — including attempting to bypass usage limits,
          sharing daily access codes outside their intended use, or using the service for
          unlawful purposes.
        </p>

        <h2>5. Your data</h2>
        <p>
          You own the financial data you enter. See our Privacy Policy for details on how it's
          stored and processed. You may request deletion of your account and data at any time.
        </p>

        <h2>6. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, FinSnap and its operators are not liable for
          indirect, incidental, or consequential damages arising from use of the service,
          including errors in OCR-extracted data, missed budget alerts, or reliance on any
          summary figures for tax or financial decisions.
        </p>

        <h2>7. Changes</h2>
        <p>We may update these terms from time to time. Continued use of FinSnap after changes take effect means you accept the updated terms.</p>

        <h2>8. Governing law</h2>
        <p>These terms are governed by the laws of the Province of Ontario and the laws of Canada applicable therein.</p>

        <p className="text-xs text-slate-400 mt-8 border-t border-slate-100 pt-4">
          This document is a plain-language summary provided for transparency and does not
          constitute formal legal advice. FinSnap recommends having these terms reviewed by a
          qualified lawyer before relying on them for compliance purposes.
        </p>
      </div>
    </div>
  );
}
