import { NextResponse } from 'next/server';
import { generateScriptForHook } from '@/lib/workbench';

export async function POST(_request, { params }) {
  try {
    const { id } = await params;
    const data = await generateScriptForHook(id);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
