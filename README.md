# Store Locator Shopify App - Complete Implementation Guide

A comprehensive Store Locator Shopify application with theme integration, admin management, and storefront rendering capabilities.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Installation](#installation)
- [Configuration](#configuration)
- [Shopify App Setup](#shopify-app-setup)
- [API Endpoints](#api-endpoints)
- [Theme Integration](#theme-integration)
- [Usage Guide](#usage-guide)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Security](#security)
- [Contributing](#contributing)

## Overview

This Store Locator app provides a complete solution for managing and displaying store locations on Shopify storefronts. It replaces traditional theme-based implementations with a modern, app-driven approach that offers:

- **Admin Management**: Embedded Shopify admin interface for managing store locations
- **Theme Integration**: Seamless integration with Shopify themes via ScriptTag
- **Public API**: CORS-enabled public API for storefront data fetching
- **Slider Support**: Built-in image slider functionality for promotional banners
- **Responsive Design**: Mobile-optimized store locator display
- **Google Maps Integration**: Direct links to maps and directions

## Features

### Admin Features
- Create, edit, and delete store locations
- Upload store images via URL
- Set store coordinates (latitude/longitude)
- Configure Google Maps integration
- Manage active/inactive status
- Sort order control
- Slider image management for promotional banners
- Real-time preview of store images

### Storefront Features
- Automatic detection of store locator page
- Responsive grid layout for store cards
- Image slider with Swiper.js integration
- Google Maps integration (view on map, get directions)
- Mobile-optimized display
- Custom styling via injected CSS
- No theme code modifications required

### Technical Features
- Custom Shopify OAuth implementation
- Session token authentication via App Bridge
- Prisma ORM with PostgreSQL
- Next.js App Router
- TypeScript for type safety
- Webhook handling for app uninstall
- ScriptTag automatic management
- CORS-enabled public API

## Architecture

### Component Overview

```
┌─────────────────┐
│  Shopify Admin  │
│   (Embedded)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Admin UI       │
│  (/admin)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Admin API      │
│  (Protected)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  PostgreSQL DB │
│  (Prisma)      │
└─────────────────┘

┌─────────────────┐
│  Storefront     │
│  (/pages/store- │
│   locator)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  ScriptTag      │
│  (store-locator│
│   .js)          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Public API     │
│  (CORS Enabled) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  PostgreSQL DB │
│  (Prisma)      │
└─────────────────┘
```

### Data Flow

1. **Installation Flow**:
   - Merchant installs app from Shopify App Store
   - OAuth handshake authenticates the shop
   - Access token stored in database
   - ScriptTag created automatically
   - Webhook registered for uninstall events

2. **Admin Flow**:
   - Merchant opens embedded admin
   - App Bridge generates session token
   - Admin UI fetches data via protected API
   - Changes persisted to database

3. **Storefront Flow**:
   - Customer visits store locator page
   - ScriptTag loads JavaScript
   - Script fetches data from public API
   - UI rendered in designated container

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Shopify SDK**: @shopify/shopify-api v8
- **Authentication**: Custom OAuth + App Bridge
- **UI Library**: React (admin interface)
- **Frontend**: Vanilla JavaScript (storefront script)
- **Slider**: Swiper.js
- **Deployment**: Node.js, PM2, Nginx

## Project Structure

```
storelocator-app/
├── prisma/
│   └── schema.prisma              # Database schema
├── public/                        # Static assets
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   └── page.tsx          # Admin UI
│   │   ├── api/
│   │   │   ├── admin/
│   │   │   │   ├── locations/    # Admin location API
│   │   │   │   └── slider-images/ # Admin slider API
│   │   │   ├── public/
│   │   │   │   ├── locations/    # Public location API
│   │   │   │   └── slider-images/ # Public slider API
│   │   │   ├── shopify/
│   │   │   │   ├── auth/         # OAuth endpoint
│   │   │   │   ├── callback/     # OAuth callback
│   │   │   │   └── session/     # Session validation
│   │   │   └── webhooks/         # Webhook handlers
│   │   ├── embed/                # Embedded entrypoint
│   │   ├── install/              # Manual install page
│   │   ├── store-locator.js/     # Storefront script route
│   │   ├── layout.tsx            # Root layout
│   │   └── page.tsx              # Home page
│   └── lib/
│       ├── prisma.ts             # Prisma client
│       ├── shopify.ts            # Shopify API client
│       ├── shopify-oauth.ts      # OAuth utilities
│       ├── shopify-session-token.ts # Session token validation
│       ├── session.ts            # Session management
│       ├── hmac.ts               # HMAC verification
│       └── crypto.ts             # Cryptography utilities
├── SEOPAL_THEME/                  # Shopify theme files
│   ├── sections/
│   │   └── storelocator.liquid   # Theme section
│   ├── templates/
│   ├── layout/
│   └── config/
├── .env                          # Environment variables
├── .env.example                  # Environment template
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
├── next.config.js                # Next.js config
└── Dockerfile                    # Docker configuration
```

## Database Schema

### Models

#### Shop
```prisma
model Shop {
  id            String    @id @default(cuid())
  shopifyDomain String    @unique
  accessToken   String    @db.Text
  email         String?
  name          String?
  plan          String?
  isActive      Boolean   @default(true)
  installedAt   DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  locations     StoreLocation[]
  sliderImages  SliderImage[]
}
```

#### StoreLocation
```prisma
model StoreLocation {
  id          String   @id @default(cuid())
  shopId      String
  shop        Shop     @relation(fields: [shopId], references: [id], onDelete: Cascade)
  
  name        String
  imageUrl    String?
  address     String
  phone       String?
  mapUrl      String?
  latitude    String?
  longitude   String?
  
  isActive    Boolean  @default(true)
  sortOrder   Int      @default(0)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

#### SliderImage
```prisma
model SliderImage {
  id              String   @id @default(cuid())
  shopId          String
  shop            Shop     @relation(fields: [shopId], references: [id], onDelete: Cascade)
  
  desktopImageUrl String
  mobileImageUrl  String
  altText         String?
  linkUrl         String?
  
  isActive        Boolean  @default(true)
  sortOrder       Int      @default(0)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

## Installation

### Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- Shopify Partner account
- Domain with HTTPS (for production)

### Local Development Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd storelocator-app
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
HOST=http://localhost:3000
SHOPIFY_API_KEY=your_api_key
NEXT_PUBLIC_SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SHOPIFY_API_VERSION=2024-01
SHOPIFY_SCOPES=read_script_tags,write_script_tags
DATABASE_URL=postgresql://user:password@localhost:5432/storelocator
JWT_SECRET=your_jwt_secret
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret
```

4. **Setup database**
```bash
npx prisma generate
npx prisma db push
```

5. **Run development server**
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `HOST` | Yes | App URL (e.g., https://yourapp.com) |
| `SHOPIFY_API_KEY` | Yes | Shopify API key from Partner Dashboard |
| `NEXT_PUBLIC_SHOPIFY_API_KEY` | Yes | Same as SHOPIFY_API_KEY (public) |
| `SHOPIFY_API_SECRET` | Yes | Shopify API secret from Partner Dashboard |
| `SHOPIFY_API_VERSION` | Yes | Shopify Admin API version |
| `SHOPIFY_SCOPES` | Yes | Comma-separated OAuth scopes |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret for JWT token signing |
| `SHOPIFY_WEBHOOK_SECRET` | No | Webhook HMAC verification secret |

### Required Shopify Scopes

```
read_script_tags,write_script_tags
```

Additional recommended scopes:
```
read_products,write_products
read_locations,write_locations
```

## Shopify App Setup

### 1. Create App in Partner Dashboard

1. Go to [Shopify Partners](https://partners.shopify.com)
2. Navigate to your organization
3. Click "Create app"
4. Select "Custom app"
5. Enter app name and select your development store

### 2. Configure App Settings

**App URL**: `https://YOUR_HOST/`

**Allowed redirection URL(s)**:
- `https://YOUR_HOST/api/shopify/callback`

### 3. Configure API Credentials

1. Navigate to "Configuration" > "API credentials"
2. Copy "API key" to `SHOPIFY_API_KEY`
3. Copy "API secret key" to `SHOPIFY_API_SECRET`
4. Configure "Admin API scopes" with required scopes

### 4. Install the App

1. Click "Install app" in Partner Dashboard
2. Or visit: `https://YOUR_HOST/install`
3. Enter your shop domain: `your-store.myshopify.com`
4. Complete OAuth flow

## API Endpoints

### Admin API (Protected)

#### Locations

**GET /api/admin/locations**
- Returns all locations for the authenticated shop
- Requires: Bearer token (session token)

**POST /api/admin/locations**
- Creates a new location
- Body: `{ name, address, imageUrl?, phone?, mapUrl?, latitude?, longitude?, isActive?, sortOrder? }`
- Requires: Bearer token (session token)

**PUT /api/admin/locations**
- Updates an existing location
- Body: `{ id, name, address, imageUrl?, phone?, mapUrl?, latitude?, longitude?, isActive?, sortOrder? }`
- Requires: Bearer token (session token)

**DELETE /api/admin/locations?id=LOCATION_ID**
- Deletes a location
- Requires: Bearer token (session token)

#### Slider Images

**GET /api/admin/slider-images**
- Returns all slider images for the authenticated shop
- Requires: Bearer token (session token)

**POST /api/admin/slider-images**
- Creates a new slider image
- Body: `{ desktopImageUrl, mobileImageUrl, altText?, linkUrl?, isActive?, sortOrder? }`
- Requires: Bearer token (session token)

**PUT /api/admin/slider-images**
- Updates an existing slider image
- Body: `{ id, desktopImageUrl, mobileImageUrl, altText?, linkUrl?, isActive?, sortOrder? }`
- Requires: Bearer token (session token)

**DELETE /api/admin/slider-images?id=IMAGE_ID**
- Deletes a slider image
- Requires: Bearer token (session token)

### Public API (CORS Enabled)

**GET /api/public/locations?shop=SHOP_DOMAIN**
- Returns active locations for the specified shop
- Query params: `shop` (required, e.g., `your-store.myshopify.com`)
- No authentication required
- CORS enabled for storefront access

**GET /api/public/slider-images?shop=SHOP_DOMAIN**
- Returns active slider images for the specified shop
- Query params: `shop` (required, e.g., `your-store.myshopify.com`)
- No authentication required
- CORS enabled for storefront access

### Shopify OAuth Endpoints

**GET /api/shopify/auth**
- Initiates OAuth flow
- Query params: `shop` (required)

**GET /api/shopify/callback**
- OAuth callback handler
- Query params: `shop`, `code`, `hmac`

**GET /api/shopify/session**
- Validates session token
- Headers: `Authorization: Bearer <token>`

### Storefront Script

**GET /store-locator.js?shop=SHOP_DOMAIN**
- Returns JavaScript for storefront rendering
- Query params: `shop` (required)
- Content-Type: `application/javascript`
- Automatically injected via ScriptTag

## Theme Integration

### Automatic Integration (Recommended)

The app automatically integrates with your theme via ScriptTag. No theme modifications are required.

### Manual Integration

If you prefer manual control, add this to your theme:

1. **Create Store Locator Page**
   - In Shopify Admin, go to Online Store > Pages
   - Create a new page with handle: `store-locator`
   - Add the Store Locator section from the theme editor

2. **Add Section to Theme**
   - In theme editor, add "Store Locator" section to the page
   - The section includes: `<div data-store-locator></div>`

3. **Optional: Custom Placement**
   - Add `<div data-store-locator></div>` anywhere in your liquid templates
   - The script will render the store locator in that element

### Theme Section Schema

The theme section (`sections/storelocator.liquid`) includes:

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
  "presets": [
    {
      "name": "Store Locator"
    }
  ]
}
{% endschema %}

<div data-store-locator></div>
```

## Usage Guide

### For Merchants (Admin)

1. **Install the App**
   - Install from Shopify App Store or via direct link
   - Complete OAuth authorization

2. **Add Store Locations**
   - Navigate to Apps > Store Locator
   - Click "Add Location"
   - Fill in store details:
     - Store Name (required)
     - Store Image URL
     - Address (required)
     - Phone
     - Google Maps URL
     - Latitude
     - Longitude
     - Active status
     - Sort order
   - Click "Create"

3. **Add Slider Images** (Optional)
   - Navigate to "Slider Images" section
   - Click "Add Slider Image"
   - Fill in image details:
     - Desktop Image URL (required)
     - Mobile Image URL (required)
     - Alt Text
     - Link URL
     - Active status
     - Sort order
   - Click "Create"

4. **Manage Locations**
   - Edit existing locations by clicking "Edit"
   - Delete locations by clicking "Delete"
   - Toggle active status
   - Adjust sort order

5. **View on Storefront**
   - Visit `https://your-store.myshopify.com/pages/store-locator`
   - Verify store locator displays correctly

### For Developers

#### Adding Custom Styling

The storefront script injects CSS with the prefix `.sl-`. You can override styles in your theme:

```css
/* Override card background */
.sl-card {
  background: #f5f5f5;
  border: 2px solid #333;
}

/* Override button color */
.sl-btn {
  background: #ff6b6b !important;
}
```

#### Custom API Integration

You can fetch location data directly from the public API:

```javascript
fetch('https://yourapp.com/api/public/locations?shop=your-store.myshopify.com')
  .then(res => res.json())
  .then(data => {
    console.log(data.locations);
  });
```

#### Webhook Handling

The app handles the `APP_UNINSTALLED` webhook to clean up:
- Deletes shop from database
- Removes ScriptTag
- Cleans up associated data

## Deployment

### Production Deployment (AWS EC2)

See `NEW_APP_IMPLEMENTATION_GUIDE.md` for detailed AWS deployment instructions.

### Quick Deployment Steps

1. **Prepare Server**
   - Ensure Node.js 18+ and PostgreSQL are installed
   - Configure firewall to allow port 3000 (or your chosen port)

2. **Deploy Application**
```bash
# Upload files to server
scp -r . user@server:/path/to/app

# SSH into server
ssh user@server
cd /path/to/app

# Install dependencies
npm install --production

# Setup database
npx prisma generate
npx prisma db push

# Build application
npm run build

# Start with PM2
PORT=3000 pm2 start npm --name "storelocator" -- start
pm2 save
pm2 startup
```

3. **Configure Nginx**
```nginx
server {
    listen 80;
    server_name yourapp.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

4. **Configure SSL**
```bash
sudo certbot --nginx -d yourapp.com
```

5. **Update Environment**
- Update `.env` with production values
- Set `HOST=https://yourapp.com`
- Ensure `DATABASE_URL` points to production database

### Docker Deployment

```bash
# Build image
docker build -t storelocator-app .

# Run container
docker run -d \
  -p 3000:3000 \
  -e HOST=https://yourapp.com \
  -e DATABASE_URL=postgresql://... \
  -e SHOPIFY_API_KEY=... \
  -e SHOPIFY_API_SECRET=... \
  --name storelocator \
  storelocator-app
```

## Troubleshooting

### Common Issues

#### Admin Shows "Unauthorized"

**Cause**: Session token not available or invalid

**Solutions**:
- Open the app from Shopify Admin (embedded mode)
- Ensure App Bridge is properly initialized
- Check that `host` parameter is preserved
- Verify `NEXT_PUBLIC_SHOPIFY_API_KEY` is set correctly

#### Storefront Shows Nothing

**Cause**: ScriptTag not loading or API not accessible

**Solutions**:
- Verify ScriptTag exists in Shopify Admin
- Check that `HOST` is publicly accessible
- Ensure at least one active location exists
- Check browser console for JavaScript errors
- Verify CORS headers on public API

#### Locations API Returns 404

**Cause**: Shop not installed or invalid shop parameter

**Solutions**:
- Confirm shop is installed in database
- Verify `shop` parameter format: `your-store.myshopify.com`
- Check shop domain is lowercase
- Verify database connection

#### ScriptTag Not Created During Install

**Cause**: Insufficient permissions or API error

**Solutions**:
- Verify `write_script_tags` scope is granted
- Check Shopify API credentials
- Review server logs for errors
- Manually create ScriptTag via Shopify Admin API

#### Database Connection Errors

**Cause**: Invalid database URL or connection issues

**Solutions**:
- Verify `DATABASE_URL` is correct
- Check PostgreSQL is running
- Ensure database exists
- Verify user permissions
- Check network connectivity

#### OAuth Fails

**Cause**: Invalid credentials or redirect URL mismatch

**Solutions**:
- Verify `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET`
- Check redirect URL in Partner Dashboard matches `HOST/api/shopify/callback`
- Ensure `HOST` is accessible
- Verify HMAC validation is working

### Debug Mode

Enable debug logging by setting:

```env
DEBUG=shopify:*
NODE_ENV=development
```

### Log Locations

- **Application logs**: PM2 logs (`pm2 logs storelocator`)
- **Nginx logs**: `/var/log/nginx/error.log`
- **System logs**: `/var/log/syslog`

## Security

### Authentication

- **Admin API**: Protected by Shopify session tokens via App Bridge
- **Public API**: No authentication (CORS enabled for storefront)
- **OAuth**: Custom implementation with HMAC verification
- **Webhooks**: HMAC signature validation

### Data Protection

- Access tokens encrypted at rest
- Database connections use SSL
- API secrets stored in environment variables
- No sensitive data in client-side code

### Best Practices

1. **Never commit `.env` files** to version control
2. **Use strong secrets** for JWT and API keys
3. **Enable HTTPS** in production (required for Shopify)
4. **Rotate secrets** periodically
5. **Monitor logs** for suspicious activity
6. **Keep dependencies** updated
7. **Use environment-specific** configurations
8. **Implement rate limiting** for public APIs (future enhancement)

### CORS Configuration

Public APIs have CORS enabled:

```typescript
res.headers.set('Access-Control-Allow-Origin', '*');
res.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS');
res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
```

For production, consider restricting to specific domains.

## Contributing

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Code Style

- Use TypeScript for type safety
- Follow existing code patterns
- Add comments for complex logic
- Keep functions small and focused
- Use meaningful variable names

### Testing

```bash
# Run tests (when implemented)
npm test

# Run linter
npm run lint

# Type checking
npm run type-check
```

## License

Proprietary - All rights reserved

## Support

For issues and questions:
- Email: support@yourdomain.com
- Documentation: See project README
- Shopify Partners: https://partners.shopify.com

## Changelog

### Version 1.0.0 (Current)
- Initial release
- Store location management
- Slider image support
- Theme integration via ScriptTag
- Admin UI with embedded authentication
- Public API with CORS
- Webhook handling
- Responsive storefront display

---

**Last Updated**: May 31, 2026
**Version**: 1.0.0
**Maintainer**: Development Team
