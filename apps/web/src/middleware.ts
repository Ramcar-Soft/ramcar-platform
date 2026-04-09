import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { isRouteAllowedForRole } from "@ramcar/shared";
import type { Role } from "@ramcar/shared";

const intlMiddleware = createIntlMiddleware(routing);

function parseLocalePath(pathname: string): { prefix: string; path: string } {
  for (const locale of routing.locales) {
    if (locale === routing.defaultLocale) continue;
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      return {
        prefix: `/${locale}`,
        path: pathname.slice(`/${locale}`.length) || "/",
      };
    }
  }
  return { prefix: "", path: pathname };
}

export async function middleware(request: NextRequest) {
  const { prefix, path } = parseLocalePath(request.nextUrl.pathname);

  // 1. Run Supabase auth check first to decide if we need a redirect.
  //    Wrapped in try/catch so a connection failure doesn't crash middleware.
  let user = null;
  const supabaseCookies: { name: string; value: string; options?: Record<string, unknown> }[] = [];
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            supabaseCookies.push(...cookiesToSet);
          },
        },
      },
    );

    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Supabase unreachable — treat as unauthenticated
  }

  // 2. Auth redirects — preserve locale prefix in the redirect URL.
  if (!user && !path.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = `${prefix}/login`;
    return NextResponse.redirect(url);
  }

  if (user && path.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = `${prefix}/dashboard`;
    return NextResponse.redirect(url);
  }

  if (user && path === "/") {
    const url = request.nextUrl.clone();
    url.pathname = `${prefix}/dashboard`;
    return NextResponse.redirect(url);
  }

  // 3. Role-based route protection
  if (user) {
    const role = user.app_metadata?.role as Role | undefined;

    if (!role && !path.startsWith("/unauthorized")) {
      const url = request.nextUrl.clone();
      url.pathname = `${prefix}/unauthorized`;
      return NextResponse.redirect(url);
    }

    if (role && !isRouteAllowedForRole(path, role, "web")) {
      const url = request.nextUrl.clone();
      url.pathname = `${prefix}/dashboard`;
      return NextResponse.redirect(url);
    }
  }

  // 4. No redirect needed — run intl middleware last so its rewrite
  //    response (e.g. /login → /es/login) is returned unmodified.
  const response = intlMiddleware(request);

  // Propagate any Supabase auth cookies onto the intl response.
  for (const cookie of supabaseCookies) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
