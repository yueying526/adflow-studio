import { NextResponse } from 'next/server';

function unauthorized() {
  return new NextResponse('Authentication required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="AdFlow Studio Interview Demo", charset="UTF-8"',
    },
  });
}

function unavailable() {
  return new NextResponse('Basic auth is not configured.', { status: 503 });
}

function parseBasicAuth(header) {
  if (!header?.startsWith('Basic ')) return null;
  try {
    const decoded = atob(header.slice('Basic '.length));
    const separator = decoded.indexOf(':');
    if (separator < 0) return null;
    return {
      user: decoded.slice(0, separator),
      password: decoded.slice(separator + 1),
    };
  } catch {
    return null;
  }
}

export function proxy(request) {
  const expectedUser = process.env.BASIC_AUTH_USER;
  const expectedPassword = process.env.BASIC_AUTH_PASSWORD;

  if (!expectedUser || !expectedPassword) return unavailable();

  const credentials = parseBasicAuth(request.headers.get('authorization'));
  if (credentials?.user === expectedUser && credentials?.password === expectedPassword) {
    return NextResponse.next();
  }

  return unauthorized();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|demo/|.*\\.(?:png|jpg|jpeg|gif|svg|ico|mp4|webm|css|js|map)$).*)',
  ],
};
