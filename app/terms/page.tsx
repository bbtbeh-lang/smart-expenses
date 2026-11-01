import { SUPPORT_EMAIL } from '@/lib/support';

export default function TermsOfServicePage() {
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
        <h1 className="text-2xl font-bold text-slate-900 mb-1">FinSnap Terms of Service</h1>
        <p className="text-slate-400 text-xs mb-8">Last updated: October 2026</p>

        <p>
          These terms are the agreement between you and FinSnap (“we”, “us”) for using the FinSnap web
          application. By creating an account or using FinSnap you confirm that you have read and accept
          them, together with our Privacy Policy.
        </p>

        <h2>1. What FinSnap is</h2>
        <p>
          FinSnap is a record-keeping tool. You can enter income and expenses by hand or scan a receipt,
          which is read by an AI service to pull out the merchant, date, amounts, tax and items. FinSnap
          then helps you organize, search, budget and export that information. The service is provided
          “as is” and “as available”. We work to keep it running and accurate, but we do not promise that
          it will be uninterrupted, error-free, or that every figure it reads or calculates is correct.
        </p>

        <h2>2. FinSnap is not tax, accounting or legal advice</h2>
        <p>
          <strong>FinSnap is not a licensed tax advisor, accountant, bookkeeper or lawyer, and it is not
          affiliated with or endorsed by the Canada Revenue Agency (CRA), Revenu Québec or any other
          government body.</strong> Nothing in the app, its reports, exports or guide is tax, accounting,
          financial or legal advice. FinSnap does not work out the amounts you must file or remit.
        </p>
        <p>
          Figures that were read from a receipt by AI, or that are marked as estimated (for example an
          estimated tax amount using a rate you chose), can be wrong. You are responsible for checking
          every figure against your original receipts and for confirming it with a qualified
          professional before you use it for a tax return, a government filing or a business decision.
        </p>

        <h2>3. Who can use FinSnap</h2>
        <p>
          You must be at least 18 years old. FinSnap is designed for use in Canada, and its tax terms and
          categories follow Canadian practice. You are responsible for keeping your sign-in method
          secure and for what happens under your account.
        </p>

        <h2>4. Subscriptions and billing</h2>
        <ul>
          <li>Paid plans (currently Light, Pro and Business) are billed through Stripe, monthly or yearly depending on the plan. Prices are shown in Canadian dollars in the app before you pay. If sales tax applies to your purchase, it is shown before you confirm.</li>
          <li>Each plan includes a receipt-scan allowance, shown in the app. Scanning and some exports are available only on paid plans or with a valid access code.</li>
          <li>Paid plans renew automatically until you cancel. You can cancel, upgrade or downgrade at any time from “Manage Subscription”, which opens Stripe’s secure billing portal. After you cancel you keep access until the end of the period you already paid for.</li>
          <li>Except where the law requires otherwise, payments already made are non-refundable.</li>
        </ul>

        <h2>5. Your data and your receipts</h2>
        <p>
          You own the information you put into FinSnap. You allow us to store and process it only as
          needed to run the service for you, as described in the Privacy Policy. When you scan a receipt,
          the photo is saved to your account as a convenience copy. We do not promise to keep it for any
          particular length of time and we cannot guarantee against loss, so keep your own backup of any
          receipt or record that you must retain for tax or legal purposes. You can ask us to delete your
          account and data at any time.
        </p>

        <h2>6. Acceptable use</h2>
        <p>
          You agree not to misuse the service. That includes trying to get around usage limits, sharing
          or reselling access codes outside their intended use, probing for or accessing other people’s
          data, interfering with the service’s security or operation, or using FinSnap for anything
          unlawful. We may suspend or close an account that breaks these rules.
        </p>

        <h2>7. Limitation of liability</h2>
        <p>
          To the fullest extent the law allows, FinSnap and its operators are not liable for indirect,
          incidental, special or consequential damages, or for lost profits, lost data, penalties,
          interest or tax assessments, arising from your use of the service. That includes errors in
          AI-read or estimated figures, missed budget reminders, service interruptions, and reliance on
          any report or summary for a tax filing or financial decision. To the extent liability cannot be
          excluded, our total liability to you is limited to the amount you paid us for the service in
          the 12 months before the claim. Nothing in these terms removes rights you have under law that
          cannot be waived.
        </p>

        <h2>8. Changes to the service and to these terms</h2>
        <p>
          We may change, add or remove features and plans. We may also update these terms. If a change
          is material we will tell you in the app or by email before it takes effect, and using FinSnap
          after that date means you accept the updated terms.
        </p>

        <h2>9. Governing law</h2>
        <p>
          These terms are governed by the laws of the Province of Ontario and the federal laws of Canada
          that apply there. Any dispute will be handled by the courts of Ontario, except where the law
          of your place of residence gives you the right to bring a claim elsewhere.
        </p>

        <h2>10. Contact</h2>
        <p>
          Questions about these terms?{' '}
          {SUPPORT_EMAIL ? (
            <>Contact us at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</>
          ) : (
            <>Contact us through the support link in the app.</>
          )}
        </p>
      </div>
    </div>
  );
}
