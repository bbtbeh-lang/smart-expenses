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

    let messageContent: Anthropic.MessageParam['content'];

    if (mimeType === 'application/pdf') {
      // Handle PDF
      messageContent = [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: image }
        } as any,
        {
          type: 'text',
          text: `Extract from this receipt/invoice:
1. Total amount (final total number only, no currency)
2. Store/merchant name
3. Date (YYYY-MM-DD format)

Reply ONLY with JSON: {"amount":"","description":"","date":""}`
        }
      ];
    } else {
      // Handle image
      const safeMimeType = getSupportedMimeType(mimeType);
      messageContent = [
        {
          type: 'image',
          source: { type: 'base64', media_type: safeMimeType, data: image }
        },
        {
          type: 'text',
          text: `Extract from this receipt/invoice:
1. Total amount (final total number only, no currency)
2. Store/merchant name  
3. Date (YYYY-MM-DD format)

Reply ONLY with JSON: {"amount":"","description":"","date":""}`
        }
      ];
    }

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{ role: 'user', content: messageContent }]
    });

    const text = (msg.content[0] as {type: string; text: string}).text.trim();
    const jsonMatch = text.match(/\{[^{}]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');

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
