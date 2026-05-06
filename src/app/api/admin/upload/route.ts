import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
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

    const shop = await prisma.shop.findUnique({
      where: { shopifyDomain: shopDomain },
    });
    if (!shop || !shop.accessToken) {
      return new NextResponse('Shop not found or not authenticated', { status: 403 });
    }

    // Convert file to base64 data URI
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const dataUri = `data:${file.type};base64,${base64}`;

    const apiVersion = process.env.SHOPIFY_API_VERSION || '2024-10';

    const graphqlQuery = {
      query: `mutation fileCreate($files: [FileCreateInput!]!) {
        fileCreate(files: $files) {
          files {
            ... on MediaImage {
              id
              image {
                url
              }
            }
            ... on GenericFile {
              id
              url
            }
          }
          userErrors {
            field
            message
          }
        }
      }`,
      variables: {
        files: [
          {
            alt: formData.get('alt') as string || file.name,
            contentType: 'IMAGE',
            originalSource: dataUri,
          },
        ],
      },
    };

    const res = await fetch(`https://${shopDomain}/admin/api/${apiVersion}/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': shop.accessToken,
      },
      body: JSON.stringify(graphqlQuery),
    });

    if (!res.ok) {
      const text = await res.text();
      return new NextResponse(`Shopify upload failed: ${text}`, { status: 500 });
    }

    const data = (await res.json()) as {
      data?: {
        fileCreate?: {
          files?: Array<{
            id?: string;
            image?: { url?: string };
            url?: string;
          }>;
          userErrors?: Array<{ field: string; message: string }>;
        };
      };
      errors?: Array<{ message: string }>;
    };

    const userErrors = data.data?.fileCreate?.userErrors;
    if (userErrors && userErrors.length > 0) {
      return new NextResponse(userErrors.map((e) => e.message).join(', '), { status: 500 });
    }

    const graphqlErrors = data.errors;
    if (graphqlErrors && graphqlErrors.length > 0) {
      return new NextResponse(graphqlErrors.map((e) => e.message).join(', '), { status: 500 });
    }

    const files = data.data?.fileCreate?.files || [];
    const uploadedFile = files[0];
    const url = uploadedFile?.image?.url || uploadedFile?.url;

    if (!url) {
      return new NextResponse('Upload succeeded but no URL returned', { status: 500 });
    }

    return NextResponse.json({ url, id: uploadedFile.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new NextResponse(`Upload failed: ${message}`, { status: 500 });
  }
}
