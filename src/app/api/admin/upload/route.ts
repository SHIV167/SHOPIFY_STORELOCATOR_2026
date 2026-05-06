import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { getShopDomainFromSessionToken } from '@/lib/shopify-session-token';
import { getShopFromSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

async function getShopFromAuth(req: NextRequest) {
  const tokenShop = await getShopDomainFromSessionToken(req).catch(() => null);
  return tokenShop || getShopFromSession();
}

export async function POST(req: NextRequest) {
  const shopDomain = await getShopFromAuth(req);
  if (!shopDomain) return new NextResponse('Unauthorized', { status: 401 });

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

    // Generate a unique filename
    const ext = path.extname(file.name) || '.jpg';
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

    // Save to public/uploads so Next.js serves it statically
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, uniqueName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // Build public URL from request host
    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const url = `${protocol}://${host}/uploads/${uniqueName}`;

    return NextResponse.json({ url, id: uniqueName });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new NextResponse(`Upload failed: ${message}`, { status: 500 });
  }
}
