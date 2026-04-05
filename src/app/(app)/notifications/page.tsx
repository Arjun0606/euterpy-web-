import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NotificationsList from "./NotificationsList";

export const metadata = {
  title: "Notifications — Euterpy",
};

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*, actor:profiles!notifications_actor_id_fkey(username, display_name, avatar_url)")
    .order("created_at", { ascending: false })
    .limit(50);

  // Mark all as read
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("is_read", false);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-display text-2xl mb-6">Notifications</h1>
      <NotificationsList initial={JSON.parse(JSON.stringify(notifications || []))} />
    </div>
  );
}
