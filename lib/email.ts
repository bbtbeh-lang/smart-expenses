import { Resend } from 'resend';

// This file must only ever be imported from server-side code (API routes /
// webhooks). RESEND_API_KEY is a secret and must never reach the browser.
//
// If RESEND_API_KEY is not configured, email sending is skipped silently
// (logged as a warning) rather than throwing — a missing email key should
// never break the Stripe webhook or block subscription updates.
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Must be a domain verified in the Resend dashboard. Falls back to
// Resend's shared sandbox sender so local/dev testing doesn't crash, but
// that sender ONLY delivers to the Resend account owner's own email.
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'FinSnap <onboarding@resend.dev>';

interface RenewalReminderParams {
  to: string;
  planName: string;
  amount: string; // pre-formatted, e.g. "CA$19.99"
  renewalDate: string; // pre-formatted, e.g. "August 2, 2026"
  lang: 'EN' | 'FR' | 'FA';
}

const COPY: Record<RenewalReminderParams['lang'], { subject: string; heading: string; body: (p: RenewalReminderParams) => string; cta: string }> = {
  EN: {
    subject: 'Your FinSnap subscription renews soon',
    heading: 'Upcoming renewal',
    body: (p) => `Your ${p.planName} plan will renew on ${p.renewalDate} for ${p.amount}. No action is needed if your payment method is up to date.`,
    cta: 'Manage subscription',
  },
  FR: {
    subject: 'Votre abonnement FinSnap se renouvelle bientôt',
    heading: 'Renouvellement à venir',
    body: (p) => `Votre plan ${p.planName} sera renouvelé le ${p.renewalDate} pour ${p.amount}. Aucune action requise si votre méthode de paiement est à jour.`,
    cta: "Gérer l'abonnement",
  },
  FA: {
    subject: 'اشتراک FinSnap شما به‌زودی تمدید می‌شود',
    heading: 'تمدید پیش رو',
    body: (p) => `پلن ${p.planName} شما در تاریخ ${p.renewalDate} به مبلغ ${p.amount} تمدید خواهد شد. اگر روش پرداخت شما معتبر است، نیازی به اقدام نیست.`,
    cta: 'مدیریت اشتراک',
  },
};

/**
 * Sends a "your subscription renews soon" email, triggered from the
 * Stripe `invoice.upcoming` webhook event. Fails soft: logs and returns
 * false instead of throwing, so a webhook handler can call this without
 * risking a 500 back to Stripe (which would cause pointless retries).
 */
export async function sendRenewalReminderEmail(params: RenewalReminderParams): Promise<boolean> {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — skipping renewal reminder email to', params.to);
    return false;
  }

  const copy = COPY[params.lang] || COPY.EN;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: copy.subject,
      html: renderRenewalReminderHtml(params, copy),
    });
    if (error) {
      console.error('[email] Resend returned an error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[email] Failed to send renewal reminder:', err);
    return false;
  }
}

interface GrantAccessParams {
  to: string;
  planName: string; // display name, e.g. "Pro"
  periodEndLabel: string; // pre-formatted, e.g. "October 12, 2026" or "no expiry"
  lang: 'EN' | 'FR' | 'FA';
}

const GRANT_COPY: Record<GrantAccessParams['lang'], { subject: string; heading: string; body: (p: GrantAccessParams) => string; cta: string }> = {
  EN: {
    subject: 'Your FinSnap plan has been upgraded',
    heading: "You've got free premium access",
    body: (p) => `Your FinSnap account was just granted the ${p.planName} plan${p.periodEndLabel ? ` until ${p.periodEndLabel}` : ''}, no payment needed. Sign in to start using it.`,
    cta: 'Open FinSnap',
  },
  FR: {
    subject: 'Votre forfait FinSnap a été mis à niveau',
    heading: 'Accès premium gratuit',
    body: (p) => `Votre compte FinSnap vient de recevoir le forfait ${p.planName}${p.periodEndLabel ? ` jusqu'au ${p.periodEndLabel}` : ''}, sans aucun paiement. Connectez-vous pour en profiter.`,
    cta: 'Ouvrir FinSnap',
  },
  FA: {
    subject: 'پلن FinSnap شما ارتقا پیدا کرد',
    heading: 'دسترسی پرمیوم رایگان',
    body: (p) => `حساب FinSnap شما به پلن ${p.planName}${p.periodEndLabel ? ` تا تاریخ ${p.periodEndLabel}` : ''} ارتقا پیدا کرد، بدون نیاز به پرداخت. برای استفاده وارد حساب‌تون بشید.`,
    cta: 'باز کردن FinSnap',
  },
};

/**
 * Sends a "you've been granted free access" email, triggered from the
 * admin grant-access panel. Fails soft like sendRenewalReminderEmail:
 * logs and returns false instead of throwing, so a bad/missing Resend
 * key never blocks the admin from actually granting the subscription
 * (the DB upsert already succeeded by the time this is called).
 */
export async function sendGrantAccessEmail(params: GrantAccessParams): Promise<boolean> {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — skipping grant-access email to', params.to);
    return false;
  }

  const copy = GRANT_COPY[params.lang] || GRANT_COPY.EN;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: copy.subject,
      html: renderGrantAccessHtml(params, copy),
    });
    if (error) {
      console.error('[email] Resend returned an error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[email] Failed to send grant-access email:', err);
    return false;
  }
}

function renderGrantAccessHtml(
  params: GrantAccessParams,
  copy: { subject: string; heading: string; body: (p: GrantAccessParams) => string; cta: string }
): string {
  const dir = params.lang === 'FA' ? 'rtl' : 'ltr';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fin.pixflow.one';

  return `
  <div dir="${dir}" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
    <div style="display: inline-block; padding: 6px 12px; background: linear-gradient(135deg, #10b981, #0d9488); border-radius: 999px; color: white; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;">FinSnap</div>
    <h1 style="font-size: 20px; color: #0f172a; margin: 20px 0 8px;">${copy.heading}</h1>
    <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 24px;">${copy.body(params)}</p>
    <a href="${appUrl}" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #10b981, #0d9488); color: white; font-weight: 700; font-size: 14px; text-decoration: none; border-radius: 12px;">${copy.cta}</a>
    <p style="font-size: 12px; color: #94a3b8; margin-top: 32px;">FinSnap · Canadian personal & business expense tracking</p>
  </div>`;
}

function renderRenewalReminderHtml(
  params: RenewalReminderParams,
  copy: { subject: string; heading: string; body: (p: RenewalReminderParams) => string; cta: string }
): string {
  const dir = params.lang === 'FA' ? 'rtl' : 'ltr';
  // This function is only ever called from the Stripe webhook (server-to-
  // server, no browser Origin header exists at all), so unlike the
  // checkout/portal routes, this ALWAYS falls through to whichever value
  // is here whenever NEXT_PUBLIC_APP_URL isn't set — every renewal email's
  // "Manage subscription" link depends on this being right. Confirmed
  // against the Vercel dashboard: the real production domain is
  // fin.pixflow.one, not the old repo-name-based fallback this
  // used to have.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fin.pixflow.one';

  return `
  <div dir="${dir}" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
    <div style="display: inline-block; padding: 6px 12px; background: linear-gradient(135deg, #10b981, #0d9488); border-radius: 999px; color: white; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;">FinSnap</div>
    <h1 style="font-size: 20px; color: #0f172a; margin: 20px 0 8px;">${copy.heading}</h1>
    <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 24px;">${copy.body(params)}</p>
    <a href="${appUrl}" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #10b981, #0d9488); color: white; font-weight: 700; font-size: 14px; text-decoration: none; border-radius: 12px;">${copy.cta}</a>
    <p style="font-size: 12px; color: #94a3b8; margin-top: 32px;">FinSnap · Canadian personal & business expense tracking</p>
  </div>`;
}
