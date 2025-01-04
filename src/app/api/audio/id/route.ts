import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  return Response.json({ success: true });
}

export async function POST(request: NextRequest) {
  return Response.json({ success: true });
}