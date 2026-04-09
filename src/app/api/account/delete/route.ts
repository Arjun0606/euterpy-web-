import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * POST /api/account/delete
 *
 * Permanently deletes the currently-authenticated user's account.
 *
 * The flow:
 *   1. Authenticate the request via the cookie session — only the
 *      account's owner can delete it. We never accept a userId
 *      from the request body.
 *   2. Use the service-role client to call `auth.admin.deleteUser()`,
 *      which removes the auth.users row.
 *   3. The Supabase auth.users → public.profiles foreign key has
 *      ON DELETE CASCADE set in migration 001, so the profile +
 *      every dependent row (ratings, stories, lyric pins, lists,
 *      charts, follows, marks, echoes, letters, GTKM rows, etc.)
 *      gets cleaned up automatically by Postgres.
 *   4. Return a JSON success — the client signs the user out and
 *      navigates them to the marketing home page.
 *
 * This is a destructive, non-reversible action. The UI gates it
 * behind a typed-confirmation dialog ("type DELETE to confirm")
 * so it can't be triggered by an accidental click.
 */
export async function POST() {
  // 1. Authenticate via cookies — never trust the request body for
  //    a destructive action of this magnitude.
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Not authenticated." },
      { status: 401 }
    );
  }

  // 2. Use the service client to issue the admin delete. The
  //    service-role key is required to call auth.admin.* methods.
  const service = createServiceClient();
  // The @supabase/ssr server client wraps the underlying
  // SupabaseClient, so the auth.admin namespace is reachable.
  const { error: deleteError } = await (service.auth as unknown as {
    admin: { deleteUser: (id: string) => Promise<{ error: unknown }> };
  }).admin.deleteUser(user.id);

  if (deleteError) {
    console.error("[delete-account] failed for user", user.id, deleteError);
    return NextResponse.json(
      {
        error:
          "Account deletion failed. Try again, or email support if it persists.",
      },
      { status: 500 }
    );
  }

  // 3. Cascade is handled at the database layer via the FK from
  //    public.profiles → auth.users.

  // 4. Sign the cookie session out so the client doesn't keep a
  //    stale refresh token after the redirect.
  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
