import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { getShopDomainFromSessionToken } from '@/lib/shopify-session-token';
import { getShopFromSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

async function getShopFromAuth(req: NextRequest) {
  const tokenShop = await getShopDomainFromSessionToken(req).catch(() => null);
  return tokenShop || getShopFromSession();
}

export async function POST(req: NextRequest) {
  const shop = await getShopFromAuth(req);
  if (!shop) return new NextResponse('Unauthorized', { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file || file.size === 0) {
      return new NextResponse('No file provided', { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return new NextResponse('Invalid file type. Only JPEG, PNG, WebP, GIF allowed.', { status: 400 });
    }

    const maxSize = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxSize) {
      return new NextResponse('File too large. Max 5 MB.', { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadsDir, { recursive: true });

    const ext = file.type.split('/')[1] || 'jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filepath = join(uploadsDir, filename);

    await writeFile(filepath, buffer);

    const host = (process.env.HOST || '').replace(/\/$/, '');
    const url = `${host}/uploads/${filename}`;

    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new NextResponse(`Upload failed: ${message}`, { status: 500 });
  }
}
