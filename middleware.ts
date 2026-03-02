import { NextResponse, type NextRequest } from "next/server";

// Auth disabled — dashboard is publicly accessible to anyone with the link.
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
