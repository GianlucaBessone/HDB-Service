import { NextResponse } from 'next/server';
import { prisma } from './prisma';

/**
 * Idempotency handler for API routes.
 * If X-Idempotency-Key header is present, checks if action was already processed.
 * Returns cached response if so; otherwise executes handler and stores result.
 */
export async function withIdempotency(
  req: Request,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const key = req.headers.get('X-Idempotency-Key');

  if (!key) {
    return handler();
  }

  try {
    const existing = await prisma.idempotencyKey.findUnique({
      where: { key },
    });

    if (existing) {
      console.log(`[Idempotency] key ${key} found, returning cached response.`);
      return NextResponse.json(existing.response || { success: true }, { status: 200 });
    }

    const response = await handler();

    if (response.ok) {
      try {
        const data = await response.clone().json();
        await prisma.idempotencyKey.create({
          data: { key, response: data },
        });
      } catch {
        await prisma.idempotencyKey.create({ data: { key } });
      }
    }

    return response;
  } catch (error) {
    console.error('[Idempotency] Error:', error);
    return handler();
  }
}
