import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CirclesClient from "./CirclesClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Circles" };

export default async function CirclesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Circles I own
  const { data: ownedCircles } = await supabase
    .from("circles")
    .select("id, name, description, cover_emoji, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  // Circles I'm a member of (but don't own)
  const { data: memberRows } = await supabase
    .from("circle_members")
    .select("circle_id, circles(id, name, description, cover_emoji, created_at, owner_id)")
    .eq("user_id", user.id);

  const memberCircles = (memberRows || [])
    .map((row: any) => row.circles)
    .filter((c: any) => c && c.owner_id !== user.id);

  return (
    <main className="max-w-3xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
      <div className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-2">— Closer than followers</p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight leading-none">
          Your <span className="italic text-accent">circles.</span>
        </h1>
        <p className="text-zinc-500 text-sm mt-3 max-w-md">
          A circle is a small private group whose members see each other&apos;s music identity in a more intimate way. Friend groups, the listening crew, the inner room.
        </p>
      </div>

      <CirclesClient ownedCircles={ownedCircles || []} memberCircles={memberCircles} />

      <div className="mt-10 pt-8 border-t border-white/[0.04] text-center">
        <Link href="/feed" className="text-[11px] text-zinc-600 hover:text-accent transition-colors">
          ← Back to feed
        </Link>
      </div>
    </main>
  );
}
