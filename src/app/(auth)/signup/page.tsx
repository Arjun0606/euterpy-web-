"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Step = "hello" | "credentials" | "username" | "bio";

export default function SignUpPage() {
  const [step, setStep] = useState<Step>("hello");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const steps: Step[] = ["hello", "credentials", "username", "bio"];
  const stepIndex = steps.indexOf(step);

  async function handleSignUp() {
    setError(null);
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setError("3-20 characters, letters, numbers, underscores");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .single();

    if (existing) {
      setError("That username is taken");
      setLoading(false);
      return;
    }

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (data?.user && (displayName || bio)) {
      await supabase.from("profiles").update({
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
      }).eq("id", data.user.id);
    }

    router.push("/welcome");
  }

  async function finishCredentials() {
    if (!email.includes("@")) { setError("Enter a valid email"); return; }
    if (password.length < 6) { setError("Password needs at least 6 characters"); return; }
    setError(null);
    setStep("username");
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Soft accent glow */}
      <div className="absolute top-0 right-0 w-[600px] h-[500px] bg-accent/[0.06] rounded-full blur-[140px] -z-0 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 py-12 sm:py-16 min-h-screen flex flex-col">
        {/* Top brand bar */}
        <div className="mb-12">
          <Link href="/" className="font-display text-2xl tracking-tight text-foreground hover:text-accent transition-colors">
            Euterpy
          </Link>
        </div>

        {/* Two-column layout: editorial left, form right */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-12 lg:gap-20 items-center">
          {/* LEFT — editorial brand hero. Sticky on desktop. */}
          <div className="lg:sticky lg:top-24">
            <p className="text-[11px] uppercase tracking-[0.25em] text-accent font-semibold mb-5">— Make a page</p>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl tracking-tighter leading-[0.92] mb-6">
              A music identity, <span className="italic text-accent">handmade.</span>
            </h1>
            <p className="editorial italic text-base sm:text-lg text-zinc-400 leading-[1.65] max-w-md mb-8">
              Three records that explain you. Stories about songs that mattered.
              Lyrics you carry like tattoos. The opposite of a streaming history.
            </p>

            <p className="editorial italic text-xs text-zinc-600 max-w-md leading-relaxed">
              Already here?{" "}
              <Link href="/login" className="text-accent hover:underline not-italic">
                Log in
              </Link>
            </p>
          </div>

          {/* RIGHT — the form column. Stays narrow because forms are vertical. */}
          <div className="w-full max-w-md mx-auto lg:mx-0">
            {/* Progress strip */}
            <div className="flex gap-1.5 mb-10">
              {steps.map((s, i) => (
                <div
                  key={s}
                  className={`h-[2px] flex-1 rounded-full transition-all duration-500 ${
                    i <= stepIndex ? "bg-accent" : "bg-white/[0.06]"
                  }`}
                />
              ))}
            </div>

            <div className="bg-card border border-border rounded-3xl p-7 sm:p-9">
              {/* ===== STEP 1: HELLO ===== */}
              {step === "hello" && (
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-3">— Welcome</p>
                  <h2 className="font-display text-3xl tracking-tight leading-tight mb-3">
                    Hello, music maven.
                  </h2>
                  <p className="text-zinc-500 text-sm leading-relaxed mb-8 italic editorial">
                    Your taste in music says more about you than anything else.
                    Let&apos;s give it a home.
                  </p>

                  <button
                    onClick={() => setStep("credentials")}
                    className="w-full py-3.5 bg-accent text-white font-medium rounded-xl hover:bg-accent-hover transition-all text-sm"
                  >
                    Let&apos;s go
                  </button>
                </div>
              )}

              {/* ===== STEP 2: EMAIL + PASSWORD ===== */}
              {step === "credentials" && (
                <div>
                  <button
                    onClick={() => setStep("hello")}
                    className="text-zinc-700 text-xs mb-6 hover:text-accent transition-colors"
                  >
                    ← Back
                  </button>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-3">— Step one</p>
                  <h2 className="font-display text-3xl tracking-tight leading-tight mb-3">
                    First, the basics.
                  </h2>
                  <p className="text-zinc-500 text-sm mb-7 italic editorial">
                    Your email and a password. That&apos;s it.
                  </p>

                  <div className="space-y-3 mb-4">
                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      autoFocus
                      onChange={(e) => { setEmail(e.target.value); setError(null); }}
                      onKeyDown={(e) => e.key === "Enter" && document.getElementById("pw")?.focus()}
                      className="w-full px-4 py-3.5 bg-background border border-border rounded-xl text-foreground placeholder:text-zinc-700 focus:outline-none focus:border-accent/40 transition-colors"
                    />
                    <input
                      type="password"
                      id="pw"
                      placeholder="Password (6+ characters)"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(null); }}
                      onKeyDown={(e) => e.key === "Enter" && email.includes("@") && password.length >= 6 && finishCredentials()}
                      className="w-full px-4 py-3.5 bg-background border border-border rounded-xl text-foreground placeholder:text-zinc-700 focus:outline-none focus:border-accent/40 transition-colors"
                    />
                  </div>

                  {error && <p className="text-sm text-red-400 italic mb-3">{error}</p>}

                  <button
                    onClick={finishCredentials}
                    disabled={!email.includes("@") || password.length < 6}
                    className="w-full py-3.5 bg-accent text-white font-medium rounded-xl hover:bg-accent-hover disabled:opacity-20 transition-colors"
                  >
                    Continue
                  </button>
                </div>
              )}

              {/* ===== STEP 3: USERNAME ===== */}
              {step === "username" && (
                <div>
                  <button
                    onClick={() => setStep("credentials")}
                    className="text-zinc-700 text-xs mb-6 hover:text-accent transition-colors"
                  >
                    ← Back
                  </button>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-3">— Step two</p>
                  <h2 className="font-display text-3xl tracking-tight leading-tight mb-3">
                    Pick your name.
                  </h2>
                  <p className="text-zinc-500 text-sm mb-2 italic editorial">
                    This is how people find you.
                  </p>
                  <p className="font-mono text-zinc-600 text-sm mb-7">
                    euterpy.com/<span className="text-accent">{username || "..."}</span>
                  </p>

                  <div className="relative mb-4">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600">@</span>
                    <input
                      type="text"
                      placeholder="username"
                      value={username}
                      autoFocus
                      maxLength={20}
                      onChange={(e) => { setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")); setError(null); }}
                      onKeyDown={(e) => e.key === "Enter" && username.length >= 3 && setStep("bio")}
                      className="w-full pl-9 pr-4 py-3.5 bg-background border border-border rounded-xl text-foreground placeholder:text-zinc-700 focus:outline-none focus:border-accent/40 transition-colors"
                    />
                  </div>

                  {error && <p className="text-sm text-red-400 italic mb-3">{error}</p>}

                  <button
                    onClick={() => {
                      if (username.length < 3) { setError("At least 3 characters"); return; }
                      setError(null);
                      setStep("bio");
                    }}
                    disabled={username.length < 3}
                    className="w-full py-3.5 bg-accent text-white font-medium rounded-xl hover:bg-accent-hover disabled:opacity-20 transition-colors"
                  >
                    Continue
                  </button>
                </div>
              )}

              {/* ===== STEP 4: PROFILE (NAME + BIO) ===== */}
              {step === "bio" && (
                <div>
                  <button
                    onClick={() => setStep("username")}
                    className="text-zinc-700 text-xs mb-6 hover:text-accent transition-colors"
                  >
                    ← Back
                  </button>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-3">— Step three</p>
                  <h2 className="font-display text-3xl tracking-tight leading-tight mb-3">
                    Make it yours.
                  </h2>
                  <p className="text-zinc-500 text-sm mb-7 italic editorial">
                    A name and a line about your relationship with music. You can change this anytime.
                  </p>

                  {/* Preview card */}
                  <div className="bg-background border border-border rounded-xl p-5 mb-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                        <span className="font-display text-2xl text-zinc-600">{(displayName || username)[0]?.toUpperCase() || "?"}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{displayName || username}</p>
                        <p className="text-accent text-sm">@{username}</p>
                      </div>
                    </div>
                    {bio && <p className="text-zinc-400 text-sm leading-relaxed italic">{bio}</p>}
                    {!bio && <p className="text-zinc-800 text-sm italic">Your bio will appear here...</p>}
                  </div>

                  <div className="space-y-3 mb-4">
                    <input
                      type="text"
                      placeholder="Display name (optional)"
                      value={displayName}
                      autoFocus
                      maxLength={50}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-zinc-700 focus:outline-none focus:border-accent/40 text-sm"
                    />
                    <textarea
                      placeholder="One line about your music taste..."
                      value={bio}
                      maxLength={160}
                      rows={2}
                      onChange={(e) => setBio(e.target.value)}
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-zinc-700 focus:outline-none focus:border-accent/40 text-sm resize-none"
                    />
                    <p className="text-right text-[11px] text-zinc-800">{bio.length}/160</p>
                  </div>

                  {error && <p className="text-sm text-red-400 italic mb-3">{error}</p>}

                  <button
                    onClick={handleSignUp}
                    disabled={loading}
                    className="w-full py-3.5 bg-accent text-white font-medium rounded-xl hover:bg-accent-hover disabled:opacity-30"
                  >
                    {loading ? "Creating your world..." : "Create account"}
                  </button>

                  <button
                    onClick={() => { setBio(""); setDisplayName(""); handleSignUp(); }}
                    className="w-full py-2 text-zinc-700 text-xs mt-3 hover:text-zinc-400 transition-colors"
                  >
                    Skip this step
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
