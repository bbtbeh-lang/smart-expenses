import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const OLD_HOST = "finpix.netlify.app";
const NEW_HOST = "fin.pixflow.one";

export function middleware(request: NextRequest) {
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    request.nextUrl.hostname;

  if (host === OLD_HOST) {
    const url = request.nextUrl.clone();
    url.hostname = NEW_HOST;
    url.protocol = "https";
    url.port = "";
    return NextResponse.redirect(url, 301);
  }

  const res = NextResponse.next();
  res.headers.set("x-debug-detected-host", host || "unknown");
  return res;
}

export const config = {
  matcher: [
    /*
     * Match all paths except static assets and Next internals,
     * so the host check above still runs for every real page/route.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
