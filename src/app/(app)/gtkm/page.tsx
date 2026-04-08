import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import GtkmManager from "./GtkmManager";

export const metadata = { title: "Manage your three albums" };
export const dynamic = "force-dynamic";

export default async function GtkmPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: items } = await supabase
    .from("get_to_know_me")
    .select("*, albums(id, apple_id, title, artist_name, artwork_url)")
    .eq("user_id", user.id)
    .order("position");

  return <GtkmManager userId={user.id} initialItems={JSON.parse(JSON.stringify(items || []))} />;
}
