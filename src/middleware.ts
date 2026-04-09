import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const publicPaths = ["/", "/login", "/signup"];

function isPublicPath(pathname: string): boolean {
  if (publicPaths.includes(pathname)) return true;
  // Album, song, artist, story, list, and playlist pages are public
  if (pathname.startsWith("/album/")) return true;
  if (pathname.startsWith("/song/")) return true;
  if (pathname.startsWith("/artist/")) return true;
  if (pathname.startsWith("/story/")) return true;
  if (pathname.startsWith("/list/")) return true;
  if (pathname.startsWith("/playlist/")) return true;
  // API routes handle their own auth
  if (pathname.startsWith("/api/")) return true;
  // User profiles are public (single-segment paths like /@username)
  // But reserved app routes must NOT be treated as profiles
  const reserved = ["feed", "search", "settings", "login", "signup", "discover", "notifications", "welcome", "shelf", "gtkm", "recap", "people", "first-friday", "annual", "curators"];
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 1 && !reserved.includes(segments[0])) return true;
  // Profile sub-pages: stats, followers, following, charts, mutuals
  const profileSubpaths = ["stats", "followers", "following", "charts", "mutuals"];
  if (segments.length === 2 && profileSubpaths.includes(segments[1]) && !reserved.includes(segments[0])) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return supabaseResponse;
  }

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
