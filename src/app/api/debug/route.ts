import { NextResponse } from "next/server";

export async function GET() {
  const teamId = process.env.APPLE_MUSIC_TEAM_ID;
  const keyId = process.env.APPLE_MUSIC_KEY_ID;
  const rawKey = process.env.APPLE_MUSIC_PRIVATE_KEY;

  return NextResponse.json({
    teamId: teamId ? `${teamId.substring(0, 4)}...` : "MISSING",
    keyId: keyId ? `${keyId.substring(0, 4)}...` : "MISSING",
    keyPresent: !!rawKey,
    keyLength: rawKey?.length || 0,
    keyStartsWith: rawKey?.substring(0, 30) || "MISSING",
    keyContainsNewlines: rawKey?.includes("\n") || false,
    keyContainsEscapedNewlines: rawKey?.includes("\\n") || false,
  });
}
