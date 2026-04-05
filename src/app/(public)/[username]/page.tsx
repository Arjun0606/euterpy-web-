import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfilePage from "@/components/profile/ProfilePage";

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, bio, album_count")
    .eq("username", username)
    .single();

  if (!profile) return { title: "Profile Not Found" };
  const name = profile.display_name || profile.username;

  return {
    title: `${name} (@${profile.username})`,
    description: `${profile.album_count} albums rated${profile.bio ? `. ${profile.bio}` : ""} — on Euterpy.`,
    openGraph: {
      title: `${name} (@${profile.username}) — Euterpy`,
      description: `${profile.album_count} albums rated${profile.bio ? `. ${profile.bio}` : ""}`,
      images: [{ url: `/api/og/profile/${profile.username}`, width: 1200, height: 630 }],
    },
  };
}

async function getFullProfile(username: string) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();
  if (!profile) return null;

  const [
    { data: getToKnowMe },
    { data: ratings },
    { data: songRatings },
    { data: shelves },
    { data: reviews },
    { data: badges },
  ] = await Promise.all([
    supabase.from("get_to_know_me").select("*, albums(*)").eq("user_id", profile.id).order("position"),
    supabase.from("ratings").select("*, albums(*)").eq("user_id", profile.id).order("created_at", { ascending: false }),
    supabase.from("song_ratings").select("*, songs(*)").eq("user_id", profile.id).order("created_at", { ascending: false }),
    supabase.from("shelves").select(`*, items:shelf_items(id, item_type, position, note, albums(apple_id, title, artist_name, artwork_url), songs(apple_id, title, artist_name, artwork_url))`).eq("user_id", profile.id).order("is_favorites", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("reviews").select("*, albums(apple_id, title, artist_name, artwork_url), songs(apple_id, title, artist_name, artwork_url)").eq("user_id", profile.id).order("created_at", { ascending: false }),
    supabase.from("user_badges").select("*, badges(*)").eq("user_id", profile.id).order("is_displayed", { ascending: false }),
  ]);

  const shelvesWithItems = (shelves || []).map((shelf: any) => ({
    ...shelf,
    items: (shelf.items || []).sort((a: any, b: any) => a.position - b.position).slice(0, 4),
  }));

  return {
    profile,
    getToKnowMe: getToKnowMe || [],
    ratings: ratings || [],
    songRatings: songRatings || [],
    shelves: shelvesWithItems,
    reviews: reviews || [],
    badges: badges || [],
  };
}

export default async function UserProfilePage({ params }: Props) {
  const { username } = await params;
  const data = await getFullProfile(username);
  if (!data) notFound();

  return (
    <ProfilePage
      data={JSON.parse(JSON.stringify(data))}
    />
  );
}
