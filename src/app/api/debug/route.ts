import { NextResponse } from "next/server";
import * as jwt from "jsonwebtoken";

export async function GET() {
  const teamId = process.env.APPLE_MUSIC_TEAM_ID;
  const keyId = process.env.APPLE_MUSIC_KEY_ID;
  const rawKey = process.env.APPLE_MUSIC_PRIVATE_KEY;

  if (!teamId || !keyId || !rawKey) {
    return NextResponse.json({ error: "Missing env vars" });
  }

  // Try both: with and without replace
  const keyWithReplace = rawKey.replace(/\\n/g, "\n");

  try {
    const token = jwt.sign({}, keyWithReplace, {
      algorithm: "ES256",
      expiresIn: "30d",
      issuer: teamId,
      header: { alg: "ES256", kid: keyId },
    });

    // Test against Apple Music
    const res = await fetch(
      "https://api.music.apple.com/v1/catalog/us/search?term=test&types=albums&limit=1",
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const body = await res.text();

    return NextResponse.json({
      tokenGenerated: true,
      tokenLength: token.length,
      appleStatus: res.status,
      appleResponse: body.substring(0, 200),
      keyLength: rawKey.length,
      keyAfterReplace: keyWithReplace.length,
      keyLinesRaw: rawKey.split("\n").length,
      keyLinesAfter: keyWithReplace.split("\n").length,
      keyLines: rawKey.split("\n").map((l: string) => `${l.length}:${l.substring(0, 10)}...`),
    });
  } catch (e: any) {
    return NextResponse.json({
      tokenGenerated: false,
      error: e.message,
      keyLength: rawKey.length,
      keyLinesRaw: rawKey.split("\n").length,
    });
  }
}
