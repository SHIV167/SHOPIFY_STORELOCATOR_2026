import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const shop = searchParams.get('shop') || '';

  if (!shop.endsWith('.myshopify.com')) {
    return new NextResponse('Missing or invalid shop', { status: 400 });
  }

  const record = await prisma.shop.findUnique({
    where: { shopifyDomain: shop.toLowerCase() },
  });

  if (!record) return new NextResponse('Not found', { status: 404 });

  const images = await prisma.sliderImage.findMany({
    where: { shopId: record.id, isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });

  const res = NextResponse.json({ images });
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return res;
}

export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return res;
}
