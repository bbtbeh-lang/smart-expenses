import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 30;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

function getSupportedMimeType(mimeType: string): ImageMediaType {
  const supported: ImageMediaType[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (supported.includes(mimeType as ImageMediaType)) return mimeType as ImageMediaType;
  return 'image/jpeg';
}

export async function POST(req: Request) {
  try {
    const { image, mimeType } = await req.json();
    const safeMimeType = getSupportedMimeType(mimeType);

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

Return ONLY valid JSON, no markdown:
{"merchant":"","date":"YYYY-MM-DD","amount":"","items":[{"name":"","price":""}]}`
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

    return Response.json({
      amount: parsed.amount || '',
      description,
      date: parsed.date || '',
      merchant: parsed.merchant || '',
      items: (parsed.items || []).map((i: {name: string; price: string}) => ({
        name: i.name,
        price: parseFloat(i.price) || 0,
      })),
    });
  } catch (error) {
    console.error('OCR error:', error);
    return Response.json({ amount: '', description: '', date: '', merchant: '', items: [] }, { status: 500 });
  }
}
