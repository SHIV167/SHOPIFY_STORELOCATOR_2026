import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getShopDomainFromSessionToken } from '@/lib/shopify-session-token';

export const dynamic = 'force-dynamic';

async function getShopFromAuth(req: NextRequest) {
  return getShopDomainFromSessionToken(req);
}

export async function GET(req: NextRequest) {
  const shopDomain = await getShopFromAuth(req);
  if (!shopDomain) return new NextResponse('Unauthorized', { status: 401 });

  const shop = await prisma.shop.findUnique({
    where: { shopifyDomain: shopDomain },
  });
  if (!shop) return new NextResponse('Not found', { status: 404 });

  const images = await prisma.sliderImage.findMany({
    where: { shopId: shop.id },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });

  return NextResponse.json({ images });
}

export async function POST(req: NextRequest) {
  const shopDomain = await getShopFromAuth(req);
  if (!shopDomain) return new NextResponse('Unauthorized', { status: 401 });

  const shop = await prisma.shop.findUnique({
    where: { shopifyDomain: shopDomain },
  });
  if (!shop) return new NextResponse('Not found', { status: 404 });

  const body = (await req.json()) as Partial<{
    desktopImageUrl: string;
    mobileImageUrl: string;
    altText: string | null;
    linkUrl: string | null;
    isActive: boolean;
    sortOrder: number;
  }>;

  if (!body.desktopImageUrl || !body.mobileImageUrl) {
    return new NextResponse('Missing required fields: desktopImageUrl, mobileImageUrl', { status: 400 });
  }

  const created = await prisma.sliderImage.create({
    data: {
      shopId: shop.id,
      desktopImageUrl: body.desktopImageUrl,
      mobileImageUrl: body.mobileImageUrl,
      altText: body.altText ?? null,
      linkUrl: body.linkUrl ?? null,
      isActive: body.isActive ?? true,
      sortOrder: body.sortOrder ?? 0,
    },
  });

  return NextResponse.json({ image: created });
}

export async function PUT(req: NextRequest) {
  const shopDomain = await getShopFromAuth(req);
  if (!shopDomain) return new NextResponse('Unauthorized', { status: 401 });

  const shop = await prisma.shop.findUnique({
    where: { shopifyDomain: shopDomain },
  });
  if (!shop) return new NextResponse('Not found', { status: 404 });

  const body = (await req.json()) as Partial<{
    id: string;
    desktopImageUrl: string;
    mobileImageUrl: string;
    altText: string | null;
    linkUrl: string | null;
    isActive: boolean;
    sortOrder: number;
  }>;

  if (!body.id) return new NextResponse('Missing id', { status: 400 });

  const existing = await prisma.sliderImage.findFirst({
    where: { id: body.id, shopId: shop.id },
  });
  if (!existing) return new NextResponse('Not found', { status: 404 });

  const updated = await prisma.sliderImage.update({
    where: { id: existing.id },
    data: {
      desktopImageUrl: body.desktopImageUrl ?? existing.desktopImageUrl,
      mobileImageUrl: body.mobileImageUrl ?? existing.mobileImageUrl,
      altText: body.altText === undefined ? existing.altText : body.altText,
      linkUrl: body.linkUrl === undefined ? existing.linkUrl : body.linkUrl,
      isActive: body.isActive ?? existing.isActive,
      sortOrder: body.sortOrder ?? existing.sortOrder,
    },
  });

  return NextResponse.json({ image: updated });
}

export async function DELETE(req: NextRequest) {
  const shopDomain = await getShopFromAuth(req);
  if (!shopDomain) return new NextResponse('Unauthorized', { status: 401 });

  const shop = await prisma.shop.findUnique({
    where: { shopifyDomain: shopDomain },
  });
  if (!shop) return new NextResponse('Not found', { status: 404 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return new NextResponse('Missing id', { status: 400 });

  const existing = await prisma.sliderImage.findFirst({
    where: { id, shopId: shop.id },
  });
  if (!existing) return new NextResponse('Not found', { status: 404 });

  await prisma.sliderImage.delete({
    where: { id: existing.id },
  });

  return NextResponse.json({ ok: true });
}
