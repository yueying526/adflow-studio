import { NextResponse } from 'next/server';
import { getWorkbench } from '@/lib/workbench';

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const data = await getWorkbench(id);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
