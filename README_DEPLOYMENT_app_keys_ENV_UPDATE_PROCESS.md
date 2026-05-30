# Store Locator App - Deployment & Environment Management Guide

## Overview

This document explains:

* Shopify OAuth configuration
* Environment variable setup
* Common OAuth issues
* API Key / Secret mismatch troubleshooting
* Deployment process
* PM2 process management
* Server update procedures
* Steps to apply environment variable changes correctly

---

# Server Information

## Production URL

```text
https://storelocator.shivjhawebtech.info
```

## Application Directory

```bash
/home/ubuntu/storelactoryapp
```

## Process Manager

```bash
PM2
```

---

# Required Environment Variables

Create or update `.env`:

```env
# Application URLs
HOST=https://storelocator.shivjhawebtech.info
NEXT_PUBLIC_HOST=https://storelocator.shivjhawebtech.info

# Shopify App Credentials
SHOPIFY_API_KEY=YOUR_SHOPIFY_API_KEY
NEXT_PUBLIC_SHOPIFY_API_KEY=YOUR_SHOPIFY_API_KEY

SHOPIFY_API_SECRET=YOUR_SHOPIFY_API_SECRET

# Shopify Permissions
SHOPIFY_SCOPES=read_script_tags,write_script_tags

# Shopify API Version
SHOPIFY_API_VERSION=2024-10
```

---

# Shopify Partner Dashboard Configuration

Navigate to:

Shopify Partners → Apps → App Setup

## App URL

```text
https://storelocator.shivjhawebtech.info
```

## Allowed Redirection URL(s)

```text
https://storelocator.shivjhawebtech.info/api/shopify/callback
```

Important:

* URLs must exactly match HOST.
* Use HTTPS only.
* No trailing slash differences.

Correct:

```text
https://storelocator.shivjhawebtech.info
```

Incorrect:

```text
https://storelocator.shivjhawebtech.info/
```

---

# OAuth Flow Verification

## Test Auth Endpoint

```bash
curl -I https://storelocator.shivjhawebtech.info/api/shopify/auth?shop=test-store.myshopify.com
```

Expected:

```http
HTTP/1.1 307 Temporary Redirect
```

Redirect should point to Shopify authorization page.

---

## Test Callback Endpoint

```bash
curl -I https://storelocator.shivjhawebtech.info/api/shopify/callback
```

Expected:

```http
HTTP/1.1 307 Temporary Redirect
location: /install?error=invalid_state
```

This is normal when callback is accessed directly.

---

# Common OAuth Issues

## Issue 1: Invalid State

### Symptoms

```text
/install?error=invalid_state
```

### Causes

* Missing OAuth cookie
* Browser blocking third-party cookies
* State mismatch
* Callback accessed manually

### Fix

* Start OAuth flow from Shopify installation page.
* Verify cookie creation.
* Verify callback URL configuration.

---

## Issue 2: API Key Mismatch

### Symptoms

```text
Unauthorized
OAuth Failed
Invalid API Key
```

### Cause

API Key in `.env` differs from Shopify Partner Dashboard.

### Verification

```bash
grep SHOPIFY_API_KEY .env
```

Compare value with Shopify Partner Dashboard.

---

## Issue 3: Secret Mismatch

### Symptoms

```text
Invalid HMAC
OAuth Failed
Failed to exchange code
```

### Verification

```bash
grep SHOPIFY_API_SECRET .env
```

Compare with Shopify App Secret.

---

## Issue 4: Wrong Host

### Symptoms

```text
Redirect URI mismatch
OAuth callback failed
```

### Verification

```bash
grep HOST .env
```

Expected:

```env
HOST=https://storelocator.shivjhawebtech.info
```

---

# Useful Debug Commands

## Verify Environment Variables

```bash
grep HOST .env

grep SHOPIFY_API_KEY .env

grep SHOPIFY_API_SECRET .env
```

---

## Check PM2 Processes

```bash
pm2 list
```

---

## View Logs

```bash
pm2 logs store-locator --lines 200
```

---

## Real-Time Logs

```bash
pm2 logs store-locator
```

---

# Standard Deployment Procedure

## Step 1 - Pull Latest Code

```bash
cd /home/ubuntu/storelactoryapp

git pull origin main
```

---

## Step 2 - Install Dependencies

```bash
npm install
```

---

## Step 3 - Generate Prisma Client

```bash
npx prisma generate
```

---

## Step 4 - Run Database Migration

```bash
npx prisma migrate deploy
```

---

## Step 5 - Build Application

```bash
npm run build
```

---

## Step 6 - Restart PM2

```bash
pm2 restart store-locator
```

---

## Step 7 - Save PM2 Configuration

```bash
pm2 save
```

---

# IMPORTANT: When Environment Variables Change

Whenever ANY value inside `.env` changes:

Examples:

```env
HOST
SHOPIFY_API_KEY
SHOPIFY_API_SECRET
DATABASE_URL
NEXT_PUBLIC_HOST
NEXT_PUBLIC_SHOPIFY_API_KEY
```

You MUST follow the complete update process.

---

## Step 1

Edit environment file:

```bash
nano .env
```

---

## Step 2

Verify changes:

```bash
cat .env
```

---

## Step 3

Rebuild Application

Required because Next.js embeds environment variables during build.

```bash
npm run build
```

---

## Step 4

Restart PM2 Process

```bash
pm2 restart store-locator
```

---

## Step 5

Save PM2 State

```bash
pm2 save
```

---

## Step 6

Verify Process

```bash
pm2 list
```

Expected:

```text
status: online
```

---

## Step 7

Verify Application

```bash
curl -I https://storelocator.shivjhawebtech.info
```

Expected:

```http
HTTP/1.1 200 OK
```

---

# Full Environment Update Checklist

Whenever `.env` changes:

```bash
cd /home/ubuntu/storelactoryapp

nano .env

npm install

npx prisma generate

npm run build

pm2 restart store-locator

pm2 save

pm2 logs store-locator --lines 50
```

---

# Emergency Recovery Steps

If application crashes:

```bash
pm2 delete store-locator

npm run build

pm2 start npm --name store-locator -- start

pm2 save
```

Verify:

```bash
pm2 list
```

---

# Final Production Verification

```bash
curl -I https://storelocator.shivjhawebtech.info

pm2 list

pm2 logs store-locator --lines 50
```

All checks should pass before releasing changes to production.

---

## Resolution History

The Shopify OAuth issue was resolved by:

1. Verifying HOST configuration.
2. Verifying SHOPIFY_API_KEY.
3. Verifying SHOPIFY_API_SECRET.
4. Confirming OAuth redirect URLs in Shopify Partner Dashboard.
5. Rebuilding the application.
6. Restarting PM2 processes.
7. Validating OAuth endpoints using curl.
8. Confirming successful redirects and callback behavior.
