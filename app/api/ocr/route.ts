import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 30;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

function getSupportedMimeType(mimeType: string): ImageMediaType {
  const supported: ImageMediaType[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (supported.includes(mimeType as ImageMediaType)) {
    return mimeType as ImageMediaType;
  }
  return 'image/jpeg';
}

export async function POST(req: Request) {
  try {
    const { image, mimeType } = await req.json();
    const safeMimeType = getSupportedMimeType(mimeType);

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { 
            type: 'image', 
            source: { 
              type: 'base64', 
              media_type: safeMimeType, 
              data: image 
            } 
          },
          { 
            type: 'text', 
            text: `You are an expert receipt scanner. Carefully read this receipt/invoice image in ANY language (Persian/Farsi, English, French, Arabic, etc.) and ANY currency.

Extract ALL of the following:
1. STORE: The store/merchant/restaurant name.
2. DATE: The date in YYYY-MM-DD format.
3. ITEMS: Every single line item on the receipt with name and price.
4. TOTAL: The final total amount (number only, no currency symbol). Look for: total, جمع کل, مبلغ کل, مجموع, grand total, amount due.

Reply ONLY with this exact JSON (no extra text, no markdown):
{"amount":"total number only","description":"store name - item1, item2, item3","date":"YYYY-MM-DD","items":[{"name":"item name","price":"price number"}]}

If a value is not found, use empty string. Always try your best to read even partial or unclear text.`
          }
        ]
      }]
    });

    const text = (msg.content[0] as {type: string; text: string}).text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    
    const parsed = JSON.parse(jsonMatch[0]);
    return Response.json(parsed);
  } catch (error) {
    console.error('OCR error:', error);
    return Response.json({ amount: '', description: '', date: '', items: [] });
  }
}
