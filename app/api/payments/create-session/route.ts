import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createPaymentSession } from '@/lib/stripe';
import { z } from 'zod';

const schema = z.object({
  amount: z.number().positive(),
  fromName: z.string(),
  toName: z.string(),
  toEmail: z.string().email(),
  sheetId: z.string(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

  const checkoutSession = await createPaymentSession({
    ...parsed.data,
    successUrl: `${baseUrl}/sheets/${parsed.data.sheetId}?payment=success`,
    cancelUrl: `${baseUrl}/sheets/${parsed.data.sheetId}?payment=cancelled`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
