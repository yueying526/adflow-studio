import { NextResponse } from 'next/server';
import { generateVideo } from '@/lib/workbench';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const data = await generateVideo(id, body);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
