import { NextResponse, type NextRequest } from "next/server";

// Fast path only: bounce signed-out visitors away from admin pages. This is a
// convenience, not the security boundary — every admin page and API verifies
// the session against the database itself.
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin") && pathname !== "/admin/login" && pathname !== "/admin/setup") {
    const name = process.env.NODE_ENV === "production" ? "__Host-aic_admin" : "aic_admin";
    if (!req.cookies.get(name)?.value) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
