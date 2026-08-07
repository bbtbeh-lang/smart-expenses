import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { computeReceiptHash, hammingDistance, DUPLICATE_THRESHOLD } from '@/lib/imageHash';
import { consumeScan, refundScan } from '@/lib/scanAccess';

export const maxDuration = 30;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

function getSupportedMimeType(mimeType: string): ImageMediaType {
  const supported: ImageMediaType[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (supported.includes(mimeType as ImageMediaType)) return mimeType as ImageMediaType;
  return 'image/jpeg';
}

const VALID_OCR_CATEGORIES = new Set([
  'catGroceries', 'catRestaurant', 'catTransport', 'catUtilities',
  'catHealth', 'catEntertainment', 'catBusinessMaterials', 'catOffice',
  'catMarketing', 'catSoftware', 'catTravel', 'catOther',
]);

// How far back to look for a matching receipt. A receipt scanned months
// apart is unlikely to be an accidental double-scan, so we don't need to
// check the user's entire history — just recent activity.
const DUPLICATE_LOOKBACK_DAYS = 180;

export async function POST(req: Request) {
  let userId: string | null = null;
  let scanConsumed = false;
  let scanResult: { scansUsed: number; scanLimit: number } = { scansUsed: 0, scanLimit: 0 };

  try {
    // Gate access BEFORE doing anything expensive: OCR is exclusive to
    // active, in-quota paid plans. This must happen before the Claude API
    // call — not just in the UI — or this endpoint could be hit directly
    // (bypassing the app entirely) for unlimited free scans.
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return Response.json({ error: 'not_authenticated' }, { status: 401 });
    }
    const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !userData?.user) {
      return Response.json({ error: 'not_authenticated' }, { status: 401 });
    }
    userId = userData.user.id;

    const consumeResult = await consumeScan(userId);
    if (!consumeResult.allowed) {
      return Response.json(
        { error: 'scan_not_allowed', scansUsed: consumeResult.scansUsed, scanLimit: consumeResult.scanLimit },
        { status: 403 }
      );
    }
    // From this point on, a scan has been counted against the user's quota.
    // If anything below fails, the catch block refunds it, since the user
    // hasn't actually received a result yet.
    scanConsumed = true;
    scanResult = consumeResult;

    const { image, mimeType } = await req.json();
    const safeMimeType = getSupportedMimeType(mimeType);

    // Kick off the duplicate check in parallel with the OCR call — they're
    // independent, so there's no reason to wait for one before the other.
    const imageBuffer = Buffer.from(image, 'base64');
    const duplicateCheckPromise = (async () => {
      try {
        const receiptHash = await computeReceiptHash(imageBuffer);
        const since = new Date(Date.now() - DUPLICATE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
        const { data: recentScans } = await supabaseAdmin
          .from('receipt_scans')
          .select('phash, merchant, receipt_date, created_at')
          .eq('user_id', userId)
          .gte('created_at', since);

        let match: { merchant: string | null; receipt_date: string | null } | null = null;
        for (const scan of recentScans || []) {
          if (hammingDistance(receiptHash, scan.phash) <= DUPLICATE_THRESHOLD) {
            match = scan;
            break;
          }
        }
        return {
          isDuplicate: !!match,
          matchedMerchant: match?.merchant || null,
          matchedDate: match?.receipt_date || null,
          receiptHash,
        };
      } catch (err) {
        console.error('Duplicate check error:', err);
        return { isDuplicate: false, receiptHash: null as string | null };
      }
    })();

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: safeMimeType, data: image }
          },
          {
            type: 'text',
            text: `You are an expert receipt/invoice scanner. Read this image in ANY language (Persian/Farsi, English, French, Arabic) and ANY currency. For reference, today's date is ${new Date().toISOString().slice(0, 10)} (YYYY-MM-DD) — receipts are essentially never dated in the future or more than a couple of years in the past, so use that as a sanity check.

Extract:
1. merchant: store/restaurant/business name
2. date: the transaction date printed on the receipt, converted to YYYY-MM-DD.
   - Numeric dates on Canadian receipts are ambiguous between MM/DD/YYYY and DD/MM/YYYY. Use context to decide: if one of the two numbers is >12 it must be the day; a French-language receipt (TPS/TVQ, Québec) is more likely DD/MM; an English receipt is more likely MM/DD. If genuinely ambiguous, prefer MM/DD/YYYY (the North American default).
   - If the date is written in the Persian/Jalali (Solar Hijri) calendar (e.g. "۱۴۰۴/۵/۱۴" or "14 مرداد 1404"), convert it to the Gregorian calendar for the output.
   - If a 2-digit year is printed (e.g. "26" or "٢٦"), expand it to the correct 4-digit year (e.g. 2026), never a different century.
   - Read each digit carefully — a smudged or low-contrast digit misread as a different one is the most common source of an impossible date (e.g. a wrong century or a future date).
   - If the date is missing, illegible, or you cannot resolve the ambiguity with reasonable confidence, return "" rather than guessing — do not output a date you are not fairly confident in.
3. items: EVERY line item with name and price (number only)
4. amount: final TOTAL (number only, no currency symbol)
5. tax: the sales tax amount shown on the receipt (e.g. a line labeled "GST", "HST", "QST", "TPS", "TVQ", or "Tax"). Sum multiple tax lines if there are several. Use "" if no tax line is shown.
6. category: your single best guess at an expense category for this receipt, based on the merchant name and items. Pick EXACTLY ONE of: "catGroceries", "catRestaurant", "catTransport", "catUtilities", "catHealth", "catEntertainment", "catBusinessMaterials", "catOffice", "catMarketing", "catSoftware", "catTravel", "catOther". If you are not reasonably confident, use "catOther".

Return ONLY valid JSON, no markdown:
{"merchant":"","date":"YYYY-MM-DD","amount":"","tax":"","category":"","items":[{"name":"","price":""}]}`
          }
        ]
      }]
    });

    const text = (msg.content[0] as { type: string; text: string }).text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');

    const parsed = JSON.parse(jsonMatch[0]);
    const itemNames = (parsed.items || []).map((i: {name: string}) => i.name).filter(Boolean);
    const description = parsed.merchant
      ? (itemNames.length > 0 ? `${parsed.merchant} — ${itemNames.join(', ')}` : parsed.merchant)
      : itemNames.join(', ');

    // Defense in depth: even with explicit prompt guidance, the model can
    // still misread a digit. A receipt dated more than 2 years ago or more
    // than a day in the future (allowing for timezones) is almost always a
    // misread rather than a real transaction — better to drop it and let
    // the form fall back to today's date (which the person can fix) than
    // silently record a wrong one.
    let safeDate = '';
    if (parsed.date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) {
      const d = new Date(parsed.date + 'T00:00:00Z');
      const now = new Date();
      const twoYearsAgo = new Date(now);
      twoYearsAgo.setFullYear(now.getFullYear() - 2);
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      if (!isNaN(d.getTime()) && d >= twoYearsAgo && d <= tomorrow) {
        safeDate = parsed.date;
      }
    }

    const duplicateInfo = await duplicateCheckPromise;

    return Response.json({
      amount: parsed.amount || '',
      description,
      date: safeDate,
      merchant: parsed.merchant || '',
      tax: parsed.tax || '',
      // Best-effort suggestion only — the user can always change it. Falls
      // back to '' (meaning "no suggestion") if the model returned
      // something outside our known category set, so the UI's existing
      // default-category logic takes over unchanged.
      category: VALID_OCR_CATEGORIES.has(parsed.category) ? parsed.category : '',
      items: (parsed.items || []).map((i: {name: string; price: string}) => ({
        name: i.name,
        price: parseFloat(i.price) || 0,
      })),
      duplicate: {
        isDuplicate: duplicateInfo.isDuplicate,
        matchedMerchant: duplicateInfo.matchedMerchant || null,
        matchedDate: duplicateInfo.matchedDate || null,
      },
      receiptHash: duplicateInfo.receiptHash,
      scansUsed: scanResult.scansUsed,
      scanLimit: scanResult.scanLimit,
    });
  } catch (error) {
    console.error('OCR error:', error);
    if (scanConsumed && userId) {
      await refundScan(userId);
    }
    return Response.json({ amount: '', description: '', date: '', merchant: '', tax: '', category: '', items: [], duplicate: { isDuplicate: false }, receiptHash: null }, { status: 500 });
  }
}
