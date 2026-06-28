import { NextResponse } from 'next/server';

export async function GET() {
  const hasKey = !!process.env.ANTHROPIC_API_KEY;
  const keyPrefix = process.env.ANTHROPIC_API_KEY?.slice(0, 10) ?? 'missing';
  return NextResponse.json({ 
    hasKey, 
    keyPrefix,
    env: process.env.NODE_ENV 
  });
}
