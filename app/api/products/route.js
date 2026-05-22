import { NextResponse } from 'next/server';
import { createProductAndGenerateBrief, getLatestBriefProduct, SOUNDCORE_URL } from '@/lib/workbench';

export async function POST(request) {
  try {
    const body = await request.json();
    const productUrl = String(body.productUrl || '').trim();
    if (!productUrl) {
      return NextResponse.json({ error: '请输入产品链接。' }, { status: 400 });
    }
    const productId = await createProductAndGenerateBrief(productUrl);
    return NextResponse.json({ productId });
  } catch (error) {
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}

export async function GET(request) {
  const url = new URL(request.url);
  if (url.searchParams.get('last') === '1') {
    const product = await getLatestBriefProduct();
    return NextResponse.json({
      productId: product?.id || '',
      productUrl: product?.productUrl || '',
    });
  }
  return NextResponse.json({ sampleUrl: SOUNDCORE_URL });
}
