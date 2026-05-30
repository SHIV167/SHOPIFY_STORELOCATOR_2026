# Shopify OAuth Troubleshooting Guide

## Problem

After deploying the Store Locator app, Shopify installation failed during OAuth authentication.

Common symptoms:

* Redirect loop during app installation
* `invalid_state` errors
* OAuth callback failures
* App installation page not loading
* "Failed to exchange code" errors
* Unauthorized API requests

---

## Root Cause

The application was running with mismatched Shopify credentials or outdated environment variables.

The OAuth flow requires:

* `SHOPIFY_API_KEY`
* `SHOPIFY_API_SECRET`
* Correct `HOST`
* Matching Shopify Partner Dashboard configuration

If any of these values differ between:

1. Local environment
2. Production `.env`
3. Shopify Partner Dashboard

OAuth authentication will fail.

---

## Required Environment Variables

Create or update `.env`:

```env
HOST=https://your-domain.com
NEXT_PUBLIC_HOST=https://your-domain.com

SHOPIFY_API_KEY=your_api_key
NEXT_PUBLIC_SHOPIFY_API_KEY=your_api_key

SHOPIFY_API_SECRET=your_api_secret

SHOPIFY_SCOPES=read_script_tags,write_script_tags

SHOPIFY_API_VERSION=2024-10
```

---

## Verify Environment Variables

SSH into the server:

```bash
grep SHOPIFY_API_KEY .env
grep SHOPIFY_API_SECRET .env
grep HOST .env
```

Expected output:

```env
HOST=https://your-domain.com
SHOPIFY_API_KEY=xxxxxxxx
SHOPIFY_API_SECRET=xxxxxxxx
```

---

## Verify Shopify Partner Dashboard

Open:

Shopify Partners → Apps → App Setup

### App URL

```text
https://your-domain.com
```

### Allowed Redirection URLs

```text
https://your-domain.com/api/shopify/callback
```

These URLs must match the `HOST` value exactly.

---

## OAuth Validation Test

Test the auth endpoint:

```bash
curl -I https://your-domain.com/api/shopify/auth?shop=test-store.myshopify.com
```

Expected:

```http
307 Temporary Redirect
location: https://test-store.myshopify.com/admin/oauth/authorize
```

If this redirect appears, OAuth URL generation is working.

---

## Callback Validation

```bash
curl -I https://your-domain.com/api/shopify/callback
```

Expected:

```http
307 Temporary Redirect
location: /install?error=invalid_state
```

This is normal when the callback is accessed directly without Shopify parameters.

---

## Deployment Steps

### Pull Latest Code

```bash
git pull origin main
```

### Install Dependencies

```bash
npm install
```

### Build Application

```bash
npm run build
```

### Restart PM2

```bash
pm2 restart store-locator
```

### Save PM2 Configuration

```bash
pm2 save
```

---

## Verify PM2 Status

```bash
pm2 list
```

Expected:

```text
status: online
```

---

## Check Application Logs

```bash
pm2 logs store-locator --lines 200
```

Useful for diagnosing:

* OAuth failures
* Database errors
* Environment variable issues
* Runtime exceptions

---

## Resolution Summary

The issue was resolved by:

1. Verifying `SHOPIFY_API_KEY`
2. Verifying `SHOPIFY_API_SECRET`
3. Verifying `HOST`
4. Confirming OAuth redirect URL configuration in Shopify Partner Dashboard
5. Rebuilding the application
6. Restarting PM2 processes

After the environment values and Shopify configuration matched correctly, OAuth installation worked successfully.
