import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ShelfDetail from "./ShelfDetail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ShelfPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: shelf } = await supabase
    .from("shelves")
    .select("*, profiles(username)")
    .eq("id", id)
    .single();

  if (!shelf) notFound();

  const { data: items } = await supabase
    .from("shelf_items")
    .select("*, albums(apple_id, title, artist_name, artwork_url), songs(apple_id, title, artist_name, artwork_url)")
    .eq("shelf_id", id)
    .order("position");

  const isOwner = user?.id === shelf.user_id;

  return (
    <ShelfDetail
      shelf={JSON.parse(JSON.stringify(shelf))}
      items={JSON.parse(JSON.stringify(items || []))}
      isOwner={isOwner}
    />
  );
}
