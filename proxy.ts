// Next.js 16 renamed the auth/session entry from `middleware.ts` to `proxy.ts`.
// Runs the Auth.js `authorized` callback on every matched request: unauthenticated
// visitors are redirected to sign in. Auth routes and static assets are excluded.
export { auth as proxy } from "@/auth";

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
