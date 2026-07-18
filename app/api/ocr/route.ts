import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { computeReceiptHash, hammingDistance, DUPLICATE_THRESHOLD } from '@/lib/imageHash';
import { consumeScan } from '@/lib/scanAccess';

export const maxDuration = 30;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

function getSupportedMimeType(mimeType: string): ImageMediaType {
  const supported: ImageMediaType[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (supported.includes(mimeType as ImageMediaType)) return mimeType as ImageMediaType;
  return 'image/jpeg';
}

// How far back to look for a matching receipt. A receipt scanned months
// apart is unlikely to be an accidental double-scan, so we don't need to
// check the user's entire history — just recent activity.
const DUPLICATE_LOOKBACK_DAYS = 180;

export async function POST(req: Request) {
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
    const userId = userData.user.id;

    const scanResult = await consumeScan(userId);
    if (!scanResult.allowed) {
      return Response.json(
        { error: 'scan_not_allowed', scansUsed: scanResult.scansUsed, scanLimit: scanResult.scanLimit },
        { status: 403 }
      );
    }

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
            text: `You are an expert receipt/invoice scanner. Read this image in ANY language (Persian/Farsi, English, French, Arabic) and ANY currency.

Extract:
1. merchant: store/restaurant/business name
2. date: date in YYYY-MM-DD format
3. items: EVERY line item with name and price (number only)
4. amount: final TOTAL (number only, no currency symbol)
5. tax: the sales tax amount shown on the receipt (e.g. a line labeled "GST", "HST", "QST", "TPS", "TVQ", or "Tax"). Sum multiple tax lines if there are several. Use "" if no tax line is shown.

Return ONLY valid JSON, no markdown:
{"merchant":"","date":"YYYY-MM-DD","amount":"","tax":"","items":[{"name":"","price":""}]}`
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

    const duplicateInfo = await duplicateCheckPromise;

    return Response.json({
      amount: parsed.amount || '',
      description,
      date: parsed.date || '',
      merchant: parsed.merchant || '',
      tax: parsed.tax || '',
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
    return Response.json({ amount: '', description: '', date: '', merchant: '', tax: '', items: [], duplicate: { isDuplicate: false }, receiptHash: null }, { status: 500 });
  }
}
