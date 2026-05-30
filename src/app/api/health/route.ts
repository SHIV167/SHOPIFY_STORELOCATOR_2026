import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'storelocator-app',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  }, { status: 200 });
}
