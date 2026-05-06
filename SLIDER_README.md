# Store Locator Slider — Complete Technical Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Admin CRUD](#admin-crud)
5. [Public APIs](#public-apis)
6. [Storefront JavaScript](#storefront-javascript)
7. [Theme Integration](#theme-integration)
8. [Two Sliders Explained](#two-sliders-explained)
9. [Customization Guide](#customization-guide)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The Store Locator app provides a **fully managed image slider** that displays on the `/pages/store-locator` Shopify storefront page. Images, navigation, and autoplay are controlled entirely from the app's admin panel via URL inputs.

---

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Admin UI   │────▶│  Next.js API      │────▶│   Prisma DB     │
│  (page.tsx) │     │  (route.ts)       │     │  (SliderImage)  │
└─────────────┘     └──────────────────┘     └─────────────────┘
                           │                            │
                           ▼                            ▼
                    ┌──────────────┐          ┌─────────────────┐
                    │ /api/admin/  │          │ /api/public/    │
                    │ slider-images│          │ slider-images   │
                    └──────────────┘          └─────────────────┘
                                                       │
                                                       ▼
                                               ┌──────────────┐
                                               │ store-locator│
                                               │ .js (Script) │
                                               └──────────────┘
                                                       │
                                                       ▼
                                               ┌──────────────┐
                                               │ Theme Page   │
                                               │ (liquid+JS)  │
                                               └──────────────┘
```

---

## Database Schema

**`SliderImage` model** — `@/prisma/schema.prisma`

```prisma
model SliderImage {
  id              String   @id @default(cuid())
  shopId          String
  desktopImageUrl String
  mobileImageUrl  String
  altText         String?
  linkUrl         String?
  isActive        Boolean  @default(true)
  sortOrder       Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  shop Shop @relation(fields: [shopId], references: [id])
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (CUID) | Primary key |
| `shopId` | String | FK to `Shop` model |
| `desktopImageUrl` | String | Desktop image URL (required) |
| `mobileImageUrl` | String | Mobile image URL (required) |
| `altText` | String? | Accessibility alt text |
| `linkUrl` | String? | Clickable link destination |
| `isActive` | Boolean | Toggle visibility |
| `sortOrder` | Int | Display order |

---

## Admin CRUD

**File:** `@/src/app/admin/page.tsx`

### Create
- Fill the **Add Slider Image** form with Desktop Image URL, Mobile Image URL, Alt Text, Link URL
- Click **Create**
- Sends `POST /api/admin/slider-images` with JSON body

### Read
- Loads on page mount
- Sends `GET /api/admin/slider-images`
- Displays in **Slider Images** table with preview thumbnail

### Update
- Click **Edit** on any row
- Form pre-fills with existing data
- Click **Update**
- Sends `PUT /api/admin/slider-images` with `id` included

### Delete
- Click **Delete** on any row
- Confirm dialog appears
- Sends `DELETE /api/admin/slider-images?id={id}`

### Admin API File
**`@/src/app/api/admin/slider-images/route.ts`**

| Method | Endpoint | Action |
|--------|----------|--------|
| `GET` | `/api/admin/slider-images` | List all for current shop |
| `POST` | `/api/admin/slider-images` | Create new slider image |
| `PUT` | `/api/admin/slider-images` | Update existing by `id` |
| `DELETE` | `/api/admin/slider-images?id={id}` | Delete by `id` |

**Auth:** All admin endpoints require a Shopify session token via `Authorization: Bearer {token}` header.

---

## Public APIs

**File:** `@/src/app/api/public/slider-images/route.ts`

**Unauthenticated** — called by the storefront JavaScript.

```
GET /api/public/slider-images?shop=store-2024-dev.myshopify.com
```

**Response:**
```json
{
  "images": [
    {
      "id": "cm123...",
      "desktopImageUrl": "https://cdn.shopify.com/.../desktop.webp",
      "mobileImageUrl": "https://cdn.shopify.com/.../mobile.webp",
      "altText": "Sale banner",
      "linkUrl": "https://store.com/collections/sale",
      "isActive": true,
      "sortOrder": 0
    }
  ]
}
```

**Query logic:**
- `isActive: true` only
- Ordered by `sortOrder ASC`, then `createdAt ASC`
- CORS headers included for cross-origin requests

---

## Storefront JavaScript

**File:** `@/src/app/store-locator.js/route.ts`

A dynamically generated JavaScript file served as a Shopify ScriptTag. It injects the slider and store cards into the theme page.

### How it loads
1. Shopify loads the ScriptTag on every page
2. JS checks if current page is `/pages/store-locator` or has `[data-store-locator]` element
3. If yes, fetches data from both public APIs
4. Builds DOM and injects into the page

### Slider Features

| Feature | Implementation |
|---------|----------------|
| **Slides** | `<picture>` element with `<source>` for responsive desktop/mobile images |
| **Prev/Next buttons** | Circular white buttons with `<` / `>` text, positioned left/right |
| **Dot navigation** | Bottom-center dots, active dot is solid white |
| **Autoplay** | Auto-advances every 5 seconds (`setInterval`) |
| **Touch swipe** | Swipe left/right on mobile to change slides |
| **Smooth transition** | CSS `transform: translateX()` with 0.5s ease |
| **Clickable links** | Entire slide wraps in `<a>` if `linkUrl` is set |
| **Lazy loading** | Only first image loads eagerly; rest are `loading="lazy"` |
| **Responsive** | Desktop image shown at ≥769px, mobile at ≤768px |

### CSS Classes (injected)

```
.sl-slider          — Slider container (position: relative, overflow: hidden)
.sl-slider-track    — Slide track (display: flex, transition: transform)
.sl-slide           — Individual slide (min-width: 100%)
.sl-slider-nav      — Prev/Next buttons (40×40px circles)
.sl-slider-prev     — Left positioning
.sl-slider-next     — Right positioning
.sl-slider-dots     — Dot container (bottom-center)
.sl-slider-dot      — Individual dot (10×10px)
.sl-slider-dot.active — Active dot (solid white)
```

### `createSlider(images)` logic

```javascript
function createSlider(images) {
  // Builds:
  // <div class="sl-slider">
  //   <div class="sl-slider-track">
  //     <div class="sl-slide">
  //       <a href="linkUrl">          ← optional
  //         <picture>
  //           <source media="(min-width:769px)" srcset="desktopImageUrl">
  //           <source media="(max-width:768px)" srcset="mobileImageUrl">
  //           <img src="desktopImageUrl" alt="altText">
  //         </picture>
  //       </a>
  //     </div>
  //   </div>
  //   <div class="sl-slider-dots">...</div>
  //   <button class="sl-slider-nav sl-slider-prev">&lt;</button>
  //   <button class="sl-slider-nav sl-slider-next">&gt;</button>
  // </div>
}
```

---

## Theme Integration

### Section File
**`@/theme_export__store-2024-dev/sections/storelocator.liquid`**

```liquid
{% schema %}
{
  "name": "Store Locator",
  "settings": [
    {
      "type": "text",
      "id": "title",
      "label": "Section Title",
      "default": "Our Stores"
    }
  ],
  "presets": [{ "name": "Store Locator" }]
}
{% endschema %}

<div data-store-locator></div>
```

This is a bare mount point. The ScriptTag JavaScript finds `[data-store-locator]` and injects content.

### Template Files

**Default page template:** `@/templates/page.json`
Contains the theme's native `slideshow` section + the `storelocator` section.

**Dedicated template:** `@/templates/page.store-locator.json` *(recommended)*
```json
{
  "sections": {
    "storelocator": {
      "type": "storelocator",
      "settings": { "title": "Our Stores" }
    }
  },
  "order": ["storelocator"]
}
```

**To use:** In Shopify Admin → Pages → Store Locator → set **Theme template** to `page.store-locator`

---

## Two Sliders Explained

If you see **two sliders** on `/pages/store-locator`, here's why:

### Slider 1 — Theme Slideshow (`slideshow.liquid`)
- **Source:** Shopify theme's native slideshow section
- **Configured in:** `templates/page.json` → `slideshow_Kgdpia`
- **Images:** Stored as theme assets / Shopify Files, managed in Theme Editor
- **Content:** Mamaearth offer banners (in your screenshot)
- **Controls:** SVG caret arrows, counter, pause/play
- **Styling:** Theme's CSS (`component-slideshow.css`, `component-slider.css`)

### Slider 2 — App Slider (`store-locator.js`)
- **Source:** Dynamically injected JavaScript
- **Configured in:** App Admin → Slider Images section
- **Images:** URLs saved to Prisma DB, fetched via API
- **Content:** Mulmul store image (in your screenshot)
- **Controls:** `<` `>` text arrows, dot navigation
- **Styling:** Inline CSS injected by the JS (`injectStyles()`)

### To show only one slider:

**Option A — Use only the app slider (recommended)**
1. Upload `templates/page.store-locator.json` to theme
2. In Shopify Admin → Pages → Store Locator → change template to `page.store-locator`
3. This removes the theme's `slideshow` section from that page

**Option B — Use only the theme slideshow**
1. Remove all images from the app's Slider Images admin
2. Or modify `store-locator.js` to skip slider rendering:
   ```javascript
   // Comment out or remove:
   // if(sliderImages && sliderImages.length) { ... }
   ```

---

## Customization Guide

### Change autoplay speed
In `@/src/app/store-locator.js/route.ts`, line ~136:
```javascript
autoplayTimer = setInterval(function(){ goTo(current+1); }, 5000);
```
Change `5000` to desired milliseconds (e.g., `3000` for 3 seconds).

### Change transition duration
In the CSS string (line ~66):
```css
.sl-slider-track{display:flex;transition:transform .5s ease;}
```
Change `.5s` to desired duration.

### Add arrow icons (SVG)
Replace the `<` / `>` text in `prevBtn` / `nextBtn` with SVG content:
```javascript
var prevBtn = el('button', {...}, []);
prevBtn.innerHTML = '<svg>...</svg>';  // Add your SVG
```

### Change dot size/color
In `injectStyles()`, modify:
```css
.sl-slider-dot{width:10px;height:10px;border-radius:50%;border:none;background:rgba(255,255,255,.6);cursor:pointer;}
.sl-slider-dot.active{background:#fff;}
```

### Add Ken Burns zoom effect
In `injectStyles()`, add:
```css
.sl-slide img{animation: kenBurns 8s ease infinite alternate;}
@keyframes kenBurns { from { transform: scale(1); } to { transform: scale(1.1); } }
```

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| No slider appears | `isActive=false` or no images saved | Add images in admin, ensure **Active** is checked |
| Slider doesn't autoplay | User interaction stopped the timer | Normal behavior — clicks/swipe reset timer |
| Images 404 | Invalid URL entered | Verify URLs in admin, check in browser devtools |
| Two sliders showing | Default `page.json` has both slideshow + storelocator sections | Switch page template to `page.store-locator` |
| Mobile shows desktop image | `mobileImageUrl` is same as `desktopImageUrl` | Enter separate mobile-optimized URLs in admin |
| CORS error in console | Public API blocked | Ensure `/api/public/slider-images` returns `Access-Control-Allow-Origin: *` |
| Script not loading | ScriptTag not registered | Verify `HOST` env var and ScriptTag installation in Shopify Partner dashboard |

---

## File Reference

| File | Purpose |
|------|---------|
| `@/src/app/admin/page.tsx` | Admin UI with CRUD forms |
| `@/src/app/api/admin/slider-images/route.ts` | Admin API (GET/POST/PUT/DELETE) |
| `@/src/app/api/public/slider-images/route.ts` | Public read API (CORS-enabled) |
| `@/src/app/store-locator.js/route.ts` | Storefront JS generator (slider + stores) |
| `@/prisma/schema.prisma` | Database schema |
| `@/theme_export__store-2024-dev/sections/storelocator.liquid` | Theme mount point |
| `@/theme_export__store-2024-dev/templates/page.json` | Default page template (has slideshow) |
| `@/theme_export__store-2024-dev/templates/page.store-locator.json` | Dedicated template (no slideshow) |
