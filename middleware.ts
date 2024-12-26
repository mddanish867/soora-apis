// // middleware.ts
// import { NextResponse } from 'next/server'
// import type { NextRequest } from 'next/server'

// export function middleware(request: NextRequest) {
//   const response = NextResponse.next()

//   response.headers.set('Access-Control-Allow-Origin', 'http://localhost:5173')
//   response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
//   response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
//   response.headers.set('Access-Control-Allow-Credentials', 'true')

//   return response
// }

// export const config = {
//   matcher: '/auth/:path*',
// }
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Allow both localhost and production domains
  const allowedOrigins = [
    "http://localhost:5173",
    "https://soora-sigma.vercel.app",
    "http://localhost:3000",
  ];

  const origin = request.headers.get("origin");

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.append('Access-Control-Allow-Origin', origin);
  }

  response.headers.append(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS, PATCH'
  );
  response.headers.append(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token,X-Requested-with, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
  response.headers.append('Access-Control-Allow-Credentials', "true");

  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
