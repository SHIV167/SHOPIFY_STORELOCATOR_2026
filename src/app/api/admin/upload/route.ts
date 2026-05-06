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

    const apiVersion = process.env.SHOPIFY_API_VERSION || '2024-10';
    const baseUrl = `https://${shopDomain}/admin/api/${apiVersion}/graphql.json`;
    const alt = (formData.get('alt') as string) || file.name;

    // Step 1: Generate staged upload target
    const stagedQuery = {
      query: `mutation stagedUploadsCreate($input: StagedUploadsCreateInput!) {
        stagedUploadsCreate(input: $input) {
          stagedUploadTargets {
            url
            resourceUrl
            parameters {
              name
              value
            }
          }
          userErrors {
            field
            message
          }
        }
      }`,
      variables: {
        input: {
          resource: 'FILE',
          stagedUploadTargets: [
            {
              filename: file.name,
              mimeType: file.type,
            },
          ],
        },
      },
    };

    const stagedRes = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': shop.accessToken,
      },
      body: JSON.stringify(stagedQuery),
    });

    if (!stagedRes.ok) {
      const text = await stagedRes.text();
      return new NextResponse(`Shopify staged upload failed: ${text}`, { status: 500 });
    }

    const stagedData = (await stagedRes.json()) as {
      data?: {
        stagedUploadsCreate?: {
          stagedUploadTargets?: Array<{
            url: string;
            resourceUrl: string;
            parameters: Array<{ name: string; value: string }>;
          }>;
          userErrors?: Array<{ field: string; message: string }>;
        };
      };
      errors?: Array<{ message: string }>;
    };

    const stagedUserErrors = stagedData.data?.stagedUploadsCreate?.userErrors;
    if (stagedUserErrors && stagedUserErrors.length > 0) {
      return new NextResponse(stagedUserErrors.map((e) => e.message).join(', '), { status: 500 });
    }

    const stagedErrors = stagedData.errors;
    if (stagedErrors && stagedErrors.length > 0) {
      return new NextResponse(stagedErrors.map((e) => e.message).join(', '), { status: 500 });
    }

    const targets = stagedData.data?.stagedUploadsCreate?.stagedUploadTargets;
    if (!targets || targets.length === 0) {
      return new NextResponse('Failed to generate staged upload target', { status: 500 });
    }
    const target = targets[0];

    // Step 2: Upload file binary to the signed URL
    const uploadForm = new FormData();
    for (const param of target.parameters) {
      uploadForm.append(param.name, param.value);
    }
    uploadForm.append('file', file);

    const uploadRes = await fetch(target.url, {
      method: 'POST',
      body: uploadForm,
    });

    if (!uploadRes.ok) {
      const text = await uploadRes.text();
      return new NextResponse(`File upload to Shopify storage failed: ${text}`, { status: 500 });
    }

    // Step 3: Create the file in Shopify using the staged resourceUrl
    const fileCreateQuery = {
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
            alt,
            contentType: 'IMAGE',
            originalSource: target.resourceUrl,
          },
        ],
      },
    };

    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': shop.accessToken,
      },
      body: JSON.stringify(fileCreateQuery),
    });

    if (!res.ok) {
      const text = await res.text();
      return new NextResponse(`Shopify fileCreate failed: ${text}`, { status: 500 });
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
