import { createClient } from "@/lib/supabase/server";
import NavBar from "@/components/layout/NavBar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  return (
    <div className="min-h-screen bg-background pb-16 sm:pb-0">
      <NavBar username={profile?.username} avatarUrl={profile?.avatar_url} />
      {children}
    </div>
  );
}
