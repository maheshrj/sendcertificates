import { NextResponse, NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function middleware(req: NextRequest) {
  // Define protected paths
  const protectedPaths = ['/api/templates', '/api/generate-certificates', '/templates', '/generate', '/dashboard', '/email', "/templates/new", "/templates/new/[id]"];
  const apiPaths = ['/api/v1']; 

  // Check if the request is for the API
  if (apiPaths.some(path => req.nextUrl.pathname.startsWith(path))) {
    const apiKey = req.headers.get('x-api-key');
    
    if (!apiKey) {
      return new NextResponse(
        JSON.stringify({ error: 'API key is required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    try {
      // Verify API key with database
      const response = await fetch(`${req.nextUrl.origin}/api/auth/verify-api-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey }),
      });

      if (!response.ok) {
        return new NextResponse(
          JSON.stringify({ error: 'Invalid API key' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Update last used timestamp
      await fetch(`${req.nextUrl.origin}/api/auth/update-api-key-usage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey }),
      });

      return NextResponse.next();
    } catch (error) {
      return new NextResponse(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // Handle regular authentication for protected routes
  if (protectedPaths.some((path) => req.nextUrl.pathname.startsWith(path))) {
    const token = req.cookies.get('token')?.value;

    if (!token || !jwt.verify(token, JWT_SECRET)) {
      if (req.nextUrl.pathname.startsWith('/api/')) {
        return new NextResponse(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      } else {
        return NextResponse.redirect(new URL('/login', req.url));
      }
    }

    // Additional check for dashboard access
    if (req.nextUrl.pathname.startsWith('/dashboard')) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        if (!decoded.isAdmin) {
          return NextResponse.redirect(new URL('/', req.url));
        }
      } catch (error) {
        return NextResponse.redirect(new URL('/login', req.url));
      }
    }
  }

  return NextResponse.next();
}