import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { computeReceiptHash, hammingDistance, DUPLICATE_THRESHOLD } from '@/lib/imageHash';
import { consumeScan, refundScan } from '@/lib/scanAccess';

export const maxDuration = 30;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

function getSupportedMimeType(mimeType: string): ImageMediaType {
  const supported: ImageMediaType[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  return supported.includes(mimeType as ImageMediaType) ? (mimeType as ImageMediaType) : 'image/jpeg';
}

const VALID_INCOME_CATEGORIES = new Set([
  'catSalesRevenue', 'catServiceRevenue', 'catConsulting',
  'catCommission', 'catRental', 'catOtherIncome',
]);

const DUPLICATE_LOOKBACK_DAYS = 180;

// Frontend already downsizes to max 1200px + jpeg 0.85 before upload, so a
// well-formed image should land well under this — this just guards against
// abuse/bad clients before we spend a scan credit or a model call on it.
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB

export async function POST(req: Request) {
  let userId: string | null = null;
  let scanConsumed = false;
  let scanResult: { scansUsed: number; scanLimit: number } = { scansUsed: 0, scanLimit: 0 };

  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return Response.json({ error: 'not_authenticated' }, { status: 401 });

    const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !userData?.user) return Response.json({ error: 'not_authenticated' }, { status: 401 });
    userId = userData.user.id;

    // Validate the payload BEFORE consuming a scan credit — a malformed
    // request shouldn't cost the user one of their daily scans.
    const body = await req.json().catch(() => null);
    const image: string | undefined = body?.image;
    const mimeType: string | undefined = body?.mimeType;
    if (!image || typeof image !== 'string') {
      return Response.json({ error: 'missing_image' }, { status: 400 });
    }

    let imageBuffer: Buffer;
    try {
      imageBuffer = Buffer.from(image, 'base64');
    } catch {
      return Response.json({ error: 'invalid_image' }, { status: 400 });
    }
    if (imageBuffer.length === 0) {
      return Response.json({ error: 'invalid_image' }, { status: 400 });
    }
    if (imageBuffer.length > MAX_IMAGE_BYTES) {
      return Response.json({ error: 'image_too_large' }, { status: 413 });
    }

    const consumeResult = await consumeScan(userId);
    if (!consumeResult.allowed) {
      return Response.json(
        { error: 'scan_not_allowed', scansUsed: consumeResult.scansUsed, scanLimit: consumeResult.scanLimit },
        { status: 403 }
      );
    }
    scanConsumed = true;
    scanResult = consumeResult;

    const safeMimeType = getSupportedMimeType(mimeType || '');

    const duplicateCheckPromise = (async () => {
      try {
        const invoiceHash = await computeReceiptHash(imageBuffer);
        const since = new Date(Date.now() - DUPLICATE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
        const { data: recentScans } = await supabaseAdmin
          .from('invoice_scans')
          .select('phash, client_name, invoice_date, created_at')
          .eq('user_id', userId)
          .gte('created_at', since);

        let match: { client_name: string | null; invoice_date: string | null } | null = null;
        for (const scan of recentScans || []) {
          if (hammingDistance(invoiceHash, scan.phash) <= DUPLICATE_THRESHOLD) {
            match = scan;
            break;
          }
        }
        return {
          isDuplicate: !!match,
          matchedClient: match?.client_name || null,
          matchedDate: match?.invoice_date || null,
          invoiceHash,
        };
      } catch (err) {
        console.error('Invoice duplicate check error:', err);
        return { isDuplicate: false, invoiceHash: null as string | null };
      }
    })();

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: safeMimeType, data: image } },
          {
            type: 'text',
            text: `You are an expert SALES/INCOME invoice scanner (not an expense receipt). Read this image in ANY language (Persian/Farsi, English, French, Arabic) and ANY currency. This document represents money the business RECEIVED from a client/customer. For reference, today's date is ${new Date().toISOString().slice(0, 10)} (YYYY-MM-DD) — invoices are essentially never dated in the future or more than a couple of years in the past, so use that as a sanity check.

Extract:
1. clientName: the customer/client/buyer name being billed (NOT the issuing business's own name)
2. invoiceNumber: invoice/reference number if present, else ""
3. date: invoice date in YYYY-MM-DD format
   - If the date is written in the Persian/Jalali (Solar Hijri) calendar (e.g. "۱۴۰۴/۵/۱۴" or "14 مرداد 1404"), convert it to the Gregorian calendar for the output.
   - If a 2-digit year is printed (e.g. "26" or "٢٦"), expand it to the correct 4-digit year (e.g. 2026), never a different century.
   - Read each digit carefully — a smudged or low-contrast digit misread as a different one is the most common source of an impossible date (e.g. a wrong century or a future date).
   - If the date is missing, illegible, or you cannot resolve it with reasonable confidence, return "" rather than guessing — do not output a date you are not fairly confident in.
4. items: EVERY line item with description and price (number only)
5. amount: final TOTAL amount received/billed (number only, no currency symbol)
6. tax: sales tax collected on this invoice (e.g. "GST", "HST", "QST", "TPS", "TVQ", "VAT"). Sum multiple tax lines. Use "" if none shown.
7. category: your best guess at an income category. Pick EXACTLY ONE of: "catSalesRevenue", "catServiceRevenue", "catConsulting", "catCommission", "catRental", "catOtherIncome". If unsure, use "catOtherIncome".

Return ONLY valid JSON, no markdown:
{"clientName":"","invoiceNumber":"","date":"YYYY-MM-DD","amount":"","tax":"","category":"","items":[{"name":"","price":""}]}`
          }
        ]
      }]
    });

    const text = (msg.content[0] as { type: string; text: string }).text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');

    const parsed = JSON.parse(jsonMatch[0]);
    const itemNames = (parsed.items || []).map((i: { name: string }) => i.name).filter(Boolean);
    const description = parsed.clientName
      ? (itemNames.length > 0 ? `${parsed.clientName} — ${itemNames.join(', ')}` : parsed.clientName)
      : itemNames.join(', ');

    // Defense in depth: even with explicit prompt guidance, the model can
    // still misread a digit. An invoice dated more than 2 years ago or more
    // than a day in the future (allowing for timezones) is almost always a
    // misread rather than a real transaction — better to drop it and let
    // the form fall back to today's date (which the person can fix) than
    // silently record a wrong one. Mirrors app/api/ocr/route.ts.
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
      clientName: parsed.clientName || '',
      invoiceNumber: parsed.invoiceNumber || '',
      tax: parsed.tax || '',
      category: VALID_INCOME_CATEGORIES.has(parsed.category) ? parsed.category : '',
      items: (parsed.items || []).map((i: { name: string; price: string }) => ({
        name: i.name,
        price: parseFloat(i.price) || 0,
      })),
      duplicate: {
        isDuplicate: duplicateInfo.isDuplicate,
        matchedClient: duplicateInfo.matchedClient || null,
        matchedDate: duplicateInfo.matchedDate || null,
      },
      invoiceHash: duplicateInfo.invoiceHash,
      scansUsed: scanResult.scansUsed,
      scanLimit: scanResult.scanLimit,
    });
  } catch (error) {
    console.error('Income OCR error:', error);
    if (scanConsumed && userId) await refundScan(userId);
    return Response.json(
      { amount: '', description: '', date: '', clientName: '', invoiceNumber: '', tax: '', category: '', items: [], duplicate: { isDuplicate: false }, invoiceHash: null },
      { status: 500 }
    );
  }
}
