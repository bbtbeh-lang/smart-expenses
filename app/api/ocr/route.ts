import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 30;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  try {
    const { image, mimeType } = await req.json();
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: image } },
          { type: 'text', text: 'Extract from this receipt: total amount (number only, no currency), merchant name, date. Reply ONLY with JSON: {"amount":"","description":"","date":"YYYY-MM-DD"}' }
        ]
      }]
    });
    const text = (msg.content[0] as {type: string; text: string}).text.trim();
    const jsonMatch = text.match(/\{.*\}/s);
    if (!jsonMatch) throw new Error('No JSON');
    return Response.json(JSON.parse(jsonMatch[0]));
  } catch (error) {
    console.error('OCR error:', error);
    return Response.json({ amount: '', description: '', date: '' });
  }
}
