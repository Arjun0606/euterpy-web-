import { NextResponse } from "next/server";
import { createClient as createSSRClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

/**
 * POST /api/account/delete
 *
 * Permanently deletes the currently-authenticated user's account.
 *
 * Two clients, deliberately:
 *
 *   1. The @supabase/ssr client authenticates the request via the
 *      user's cookie session. This is how we verify "the caller is
 *      allowed to delete THIS account" — we never trust a userId
 *      from the request body.
 *
 *   2. A fresh @supabase/supabase-js admin client, instantiated
 *      just for this handler, issues the actual deleteUser() call.
 *      We don't reuse the ssr server client because ssr wraps the
 *      underlying client for cookie-based sessions and the
 *      auth.admin.* namespace routing through that wrapper has
 *      been unreliable in practice (the original implementation
 *      of this route silently failed with a generic 500). The
 *      standard supabase-js client with the service role key is
 *      the documented pattern for admin operations.
 *
 * The cascade chain cleans up everything downstream of auth.users:
 * auth.users → public.profiles (ON DELETE CASCADE via the FK from
 * migration 001) → ratings / stories / lyric pins / lists / charts /
 * follows / marks / echoes / letters / GTKM rows.
 */
export async function POST() {
  // 1. Authenticate via cookies.
  const ssr = await createSSRClient();
  const {
    data: { user },
    error: authError,
  } = await ssr.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Not authenticated." },
      { status: 401 }
    );
  }

  // 2. Fresh admin client with the service role key.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error("[delete-account] missing env vars", {
      hasUrl: !!url,
      hasServiceKey: !!serviceKey,
    });
    return NextResponse.json(
      { error: "Server is missing the admin credentials. Contact support." },
      { status: 500 }
    );
  }

  const admin = createAdminClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);

  if (deleteError) {
    // Log the full error server-side for debugging via Vercel logs.
    console.error("[delete-account] admin.deleteUser failed", {
      userId: user.id,
      name: deleteError.name,
      message: deleteError.message,
      status: (deleteError as { status?: number }).status,
    });
    // Surface the real message to the client so the user + we can
    // see what actually went wrong, instead of the previous generic
    // "Try again" fallback.
    return NextResponse.json(
      {
        error: `Account deletion failed: ${deleteError.message}`,
      },
      { status: 500 }
    );
  }

  // 3. Sign the cookie session out so the client doesn't keep a
  //    stale refresh token after the redirect.
  await ssr.auth.signOut();

  return NextResponse.json({ ok: true });
}
