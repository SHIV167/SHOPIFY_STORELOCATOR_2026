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

  const locations = await prisma.storeLocation.findMany({
    where: { shopId: shop.id },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });

  return NextResponse.json({ locations });
}

export async function POST(req: NextRequest) {
  const shopDomain = await getShopFromAuth(req);
  if (!shopDomain) return new NextResponse('Unauthorized', { status: 401 });

  const shop = await prisma.shop.findUnique({
    where: { shopifyDomain: shopDomain },
  });
  if (!shop) return new NextResponse('Not found', { status: 404 });

  const body = (await req.json()) as Partial<{
    name: string;
    imageUrl: string | null;
    address: string;
    phone: string | null;
    mapUrl: string | null;
    latitude: string | null;
    longitude: string | null;
    isActive: boolean;
    sortOrder: number;
  }>;

  if (!body.name || !body.address) {
    return new NextResponse('Missing required fields: name, address', { status: 400 });
  }

  const created = await prisma.storeLocation.create({
    data: {
      shopId: shop.id,
      name: body.name,
      address: body.address,
      imageUrl: body.imageUrl ?? null,
      phone: body.phone ?? null,
      mapUrl: body.mapUrl ?? null,
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      isActive: body.isActive ?? true,
      sortOrder: body.sortOrder ?? 0,
    },
  });

  return NextResponse.json({ location: created });
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
    name: string;
    imageUrl: string | null;
    address: string;
    phone: string | null;
    mapUrl: string | null;
    latitude: string | null;
    longitude: string | null;
    isActive: boolean;
    sortOrder: number;
  }>;

  if (!body.id) return new NextResponse('Missing id', { status: 400 });

  const existing = await prisma.storeLocation.findFirst({
    where: { id: body.id, shopId: shop.id },
  });
  if (!existing) return new NextResponse('Not found', { status: 404 });

  const updated = await prisma.storeLocation.update({
    where: { id: existing.id },
    data: {
      name: body.name ?? existing.name,
      address: body.address ?? existing.address,
      imageUrl: body.imageUrl === undefined ? existing.imageUrl : body.imageUrl,
      phone: body.phone === undefined ? existing.phone : body.phone,
      mapUrl: body.mapUrl === undefined ? existing.mapUrl : body.mapUrl,
      latitude: body.latitude === undefined ? existing.latitude : body.latitude,
      longitude: body.longitude === undefined ? existing.longitude : body.longitude,
      isActive: body.isActive ?? existing.isActive,
      sortOrder: body.sortOrder ?? existing.sortOrder,
    },
  });

  return NextResponse.json({ location: updated });
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

  const existing = await prisma.storeLocation.findFirst({
    where: { id, shopId: shop.id },
  });
  if (!existing) return new NextResponse('Not found', { status: 404 });

  await prisma.storeLocation.delete({
    where: { id: existing.id },
  });

  return NextResponse.json({ ok: true });
}
