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

    // Decode token to see claims
    const parts = token.split(".");
    const header = JSON.parse(Buffer.from(parts[0], "base64url").toString());
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());

    return NextResponse.json({
      tokenGenerated: true,
      tokenLength: token.length,
      appleStatus: res.status,
      appleResponse: body.substring(0, 300),
      jwtHeader: header,
      jwtPayload: payload,
      keyLength: rawKey.length,
      keyLinesRaw: rawKey.split("\n").length,
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
