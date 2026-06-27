import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 30;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

function getSupportedMimeType(mimeType: string): ImageMediaType {
  if (mimeType === 'image/png') return 'image/png';
  if (mimeType === 'image/gif') return 'image/gif';
  if (mimeType === 'image/webp') return 'image/webp';
  return 'image/jpeg';
}

export async function POST(req: Request) {
  try {
    const { image, mimeType } = await req.json();
    const safeMimeType = getSupportedMimeType(mimeType);

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: safeMimeType, data: image }
          },
          {
            type: 'text',
            text: `You are a receipt OCR expert. Look at this receipt image carefully.
Extract:
1. The TOTAL amount paid (the largest/final number, no currency symbol)
2. The store or merchant name
3. The date (YYYY-MM-DD format)

If any field is unclear, use empty string.
Reply ONLY with valid JSON, nothing else:
{"amount":"","description":"","date":""}`
          }
        ]
      }]
    });

    const text = (msg.content[0] as {type: string; text: string}).text.trim();
    const jsonMatch = text.match(/\{[^{}]*\}/);
    if (!jsonMatch) throw new Error('No JSON');

    const result = JSON.parse(jsonMatch[0]);
    return Response.json({
      amount: result.amount || '',
      description: result.description || '',
      date: result.date || new Date().toISOString().slice(0, 10)
    });
  } catch (error) {
    console.error('OCR error:', error);
    return Response.json({ amount: '', description: '', date: new Date().toISOString().slice(0, 10) });
  }
}
