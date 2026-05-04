# Store Locator Shopify App

This is a Store Locator Shopify app that replaces a theme-based `storelocator.liquid` implementation by rendering the store locator UI via the app.

Target storefront page:

- `https://store-2024-dev.myshopify.com/pages/store-locator`

## What it does

- Provides an embedded admin page to manage store locations.
- Automatically injects a storefront script via Shopify ScriptTag.
- On the storefront, the script renders the Store Locator on:
  - `https://{shop}.myshopify.com/pages/store-locator`

No Liquid section logic is required for the store locator UI.

## Features

- Embedded Shopify admin page to create/update/delete store locations.
- Storefront rendering via ScriptTag (no theme section required).
- Public JSON API used by the storefront script.
- Matches the existing theme section layout (cards with image, address, phone, and action buttons).

## Tech

- Next.js (App Router)
- Prisma + PostgreSQL
- `@shopify/shopify-api` for Admin API calls
- Custom Shopify OAuth
- Shopify App Bridge session tokens for admin authentication

## Project structure

- `src/app/install`
  - Manual install page (enter `your-store.myshopify.com`)
- `src/app/api/shopify/*`
  - OAuth endpoints (`/api/shopify/auth`, `/api/shopify/callback`)
- `src/app/embed`
  - Embedded entrypoint (keeps `host` param for App Bridge)
- `src/app/admin`
  - Embedded admin UI (manage locations)
- `src/app/api/admin/locations`
  - Admin CRUD API (protected by Shopify session token)
- `src/app/api/public/locations`
  - Public locations API (CORS enabled)
- `src/app/store-locator.js`
  - Storefront script route (served as `application/javascript`)
- `prisma/schema.prisma`
  - DB schema

## Data model (Prisma)

- `Shop`
  - `shopifyDomain`, `accessToken`
- `StoreLocation`
  - `name`, `imageUrl`, `address`, `phone`, `mapUrl`, `latitude`, `longitude`
  - `isActive`, `sortOrder`

## API endpoints

Admin (requires embedded session token):

- `GET /api/admin/locations`
- `POST /api/admin/locations`
- `PUT /api/admin/locations`
- `DELETE /api/admin/locations?id=...`

Public (used by storefront JS):

- `GET /api/public/locations?shop=your-store.myshopify.com`

Storefront script:

- `GET /store-locator.js?shop=your-store.myshopify.com`

## Setup

1. Install dependencies

```bash
npm install
```

2. Configure env

```bash
cp .env.example .env
```

Required:

- `HOST`
- `SHOPIFY_API_KEY`
- `NEXT_PUBLIC_SHOPIFY_API_KEY` (same as API key)
- `SHOPIFY_API_SECRET`
- `SHOPIFY_API_VERSION`
- `SHOPIFY_SCOPES` (must include ScriptTag scopes)
- `DATABASE_URL`
- `JWT_SECRET`

Recommended:

- `SHOPIFY_WEBHOOK_SECRET` (optional; app will also use `SHOPIFY_API_SECRET` for webhook HMAC verification)

3. Setup DB

```bash
npx prisma generate
npx prisma db push
```

4. Run

```bash
npm run dev
```

## Shopify Partner Dashboard

- App URL: `https://YOUR_HOST/`
- Redirect URL: `https://YOUR_HOST/api/shopify/callback`

## Required scopes

To create ScriptTags:

- `read_script_tags`
- `write_script_tags`

Set this in `.env`:

`SHOPIFY_SCOPES=read_script_tags,write_script_tags`

## Install flow

1. Open `https://YOUR_HOST/install`
2. Enter your shop domain: `store-2024-dev.myshopify.com`
3. Complete Shopify OAuth
4. After OAuth the app redirects to `/embed` and then you can open `/admin`

During install, the app:

- Stores the shop access token in the DB
- Registers `APP_UNINSTALLED` webhook
- Creates a ScriptTag that points to `/store-locator.js?shop=...`

## How storefront rendering works

During installation, the app creates a ScriptTag:

- `src = https://YOUR_HOST/store-locator.js?shop=your-store.myshopify.com`

This script:

- Detects `/pages/store-locator`
- Fetches locations from `GET /api/public/locations?shop=...`
- Renders cards matching the previous theme section layout

### Placement logic

The storefront script mounts into the first available:

1. An element with `[data-store-locator]`
2. `main`
3. `body`

If you want pixel-perfect placement, you can add a single empty HTML element on the page:

```html
<div data-store-locator></div>
```

This is optional; the app works without it.

## Security notes

- Admin endpoints require Shopify session token (`Authorization: Bearer <token>`).
- Webhooks validate HMAC using `SHOPIFY_API_SECRET` (or `SHOPIFY_WEBHOOK_SECRET`).

## Migration from theme-based store locator

Your theme export includes:

- `theme_export__store-2024-dev/sections/storelocator.liquid`

Steps to migrate:

1. Install this app on the shop
2. Add locations in the app admin (`/admin`)
3. Open `https://{shop}.myshopify.com/pages/store-locator` and confirm the app is rendering
4. Remove/disable the `Store Locators` section from the Store Locator page in the theme editor

If you do not remove it, the page will show duplicates (theme + app).

## Troubleshooting

- Admin shows **Unauthorized**
  - Open the app from Shopify Admin (embedded) so App Bridge can generate a session token.
- Storefront shows nothing
  - Confirm the ScriptTag exists in Shopify Admin
  - Confirm `HOST` is public and accessible from the storefront
  - Confirm you have at least one active location
- Locations API returns 404
  - Confirm the shop is installed and exists in the DB
  - Confirm the `shop` query param is `your-store.myshopify.com`

## Production checklist

- **HOST must be HTTPS** (required for Shopify OAuth and storefront script loading)
- **Database**: Run `npx prisma db push` on production DB before first install
- **Webhooks**: After first install, verify `APP_UNINSTALLED` webhook exists in Shopify Admin
- **ScriptTag**: After install, confirm the script tag exists in Shopify Admin (`Settings > Notifications > Webhooks` or via API)
- **Cleanup after uninstall**: The app deletes its script tag on `APP_UNINSTALLED`

## Optional placement override

If you want the widget to mount in a specific container (e.g. below a banner), add this to the Store Locator page template:

```html
<div data-store-locator></div>
```

The script will insert the Store Locator into that element if present.
# SHOPIFY_STORELOCATOR_2026
