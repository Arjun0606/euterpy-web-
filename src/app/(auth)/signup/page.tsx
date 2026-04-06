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

    // Update profile with display name and bio if provided
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
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-black relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-accent/[0.03] rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">

        {/* Progress — thin, elegant */}
        <div className="flex gap-1.5 mb-12">
          {steps.map((s, i) => (
            <div key={s} className={`h-[2px] flex-1 rounded-full transition-all duration-500 ${
              i <= stepIndex ? "bg-accent" : "bg-zinc-900"
            }`} />
          ))}
        </div>

        {/* ===== STEP 1: HELLO ===== */}
        {step === "hello" && (
          <div className="text-center">
            <p className="text-zinc-600 text-xs uppercase tracking-[0.2em] mb-6">Welcome to</p>
            <h1 className="font-display text-5xl sm:text-6xl mb-3">Euterpy</h1>
            <p className="text-zinc-400 text-base mb-2">Hello, Musical Maven.</p>
            <p className="text-zinc-600 text-sm mb-12 max-w-xs mx-auto leading-relaxed">
              Your taste in music says more about you than anything else.
              Let&apos;s give it a home.
            </p>

            <button onClick={() => setStep("credentials")}
              className="w-full py-3.5 bg-accent text-white font-medium rounded-xl hover:bg-accent-hover transition-all text-sm">
              Let&apos;s go
            </button>

            <p className="text-zinc-700 text-sm mt-8">
              Already here? <Link href="/login" className="text-accent hover:underline">Log in</Link>
            </p>
          </div>
        )}

        {/* ===== STEP 2: EMAIL + PASSWORD ===== */}
        {step === "credentials" && (
          <div>
            <button onClick={() => setStep("hello")} className="text-zinc-700 text-sm mb-8 hover:text-zinc-400 transition-colors">← Back</button>

            <h2 className="font-display text-2xl sm:text-3xl mb-2">First, the basics</h2>
            <p className="text-zinc-500 text-sm mb-8">Your email and a password. That&apos;s it.</p>

            <div className="space-y-3 mb-4">
              <input type="email" placeholder="Email" value={email} autoFocus
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                onKeyDown={(e) => e.key === "Enter" && document.getElementById("pw")?.focus()}
                className="w-full px-4 py-3.5 bg-input border border-border rounded-xl text-foreground placeholder:text-muted/50 focus:outline-none focus:border-zinc-700" />
              <input type="password" id="pw" placeholder="Password (6+ characters)" value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                onKeyDown={(e) => e.key === "Enter" && email.includes("@") && password.length >= 6 && finishCredentials()}
                className="w-full px-4 py-3.5 bg-input border border-border rounded-xl text-foreground placeholder:text-muted/50 focus:outline-none focus:border-zinc-700" />
            </div>

            {error && <p className="text-sm text-red-400 text-center mb-3">{error}</p>}

            <button onClick={finishCredentials} disabled={!email.includes("@") || password.length < 6}
              className="w-full py-3.5 bg-accent text-white font-medium rounded-xl hover:bg-accent-hover disabled:opacity-20">
              Continue
            </button>
          </div>
        )}

        {/* ===== STEP 3: USERNAME ===== */}
        {step === "username" && (
          <div>
            <button onClick={() => setStep("credentials")} className="text-zinc-700 text-sm mb-8 hover:text-zinc-400 transition-colors">← Back</button>

            <h2 className="font-display text-2xl sm:text-3xl mb-2">Pick your name</h2>
            <p className="text-zinc-500 text-sm mb-2">This is how people find you.</p>
            <p className="font-mono text-zinc-600 text-sm mb-8">
              euterpy.app/<span className="text-accent">{username || "..."}</span>
            </p>

            <div className="relative mb-4">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600">@</span>
              <input type="text" placeholder="username" value={username} autoFocus maxLength={20}
                onChange={(e) => { setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")); setError(null); }}
                onKeyDown={(e) => e.key === "Enter" && username.length >= 3 && setStep("bio")}
                className="w-full pl-9 pr-4 py-3.5 bg-input border border-border rounded-xl text-foreground placeholder:text-muted/50 focus:outline-none focus:border-zinc-700" />
            </div>

            {error && <p className="text-sm text-red-400 text-center mb-3">{error}</p>}

            <button onClick={() => { if (username.length < 3) { setError("At least 3 characters"); return; } setError(null); setStep("bio"); }}
              disabled={username.length < 3}
              className="w-full py-3.5 bg-accent text-white font-medium rounded-xl hover:bg-accent-hover disabled:opacity-20">
              Continue
            </button>
          </div>
        )}

        {/* ===== STEP 4: PROFILE (NAME + BIO) ===== */}
        {step === "bio" && (
          <div>
            <button onClick={() => setStep("username")} className="text-zinc-700 text-sm mb-8 hover:text-zinc-400 transition-colors">← Back</button>

            <h2 className="font-display text-2xl sm:text-3xl mb-2">Make it yours</h2>
            <p className="text-zinc-500 text-sm mb-8">A name and a line about your relationship with music. You can change this anytime.</p>

            {/* Preview card */}
            <div className="bg-card border border-border rounded-xl p-5 mb-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                  <span className="font-display text-2xl text-zinc-600">{(displayName || username)[0]?.toUpperCase() || "?"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{displayName || username}</p>
                  <p className="text-accent text-sm">@{username}</p>
                </div>
              </div>
              {bio && <p className="text-zinc-400 text-sm leading-relaxed">{bio}</p>}
              {!bio && <p className="text-zinc-800 text-sm italic">Your bio will appear here...</p>}
            </div>

            <div className="space-y-3 mb-4">
              <input type="text" placeholder="Display name (optional)" value={displayName} autoFocus maxLength={50}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-3 bg-input border border-border rounded-xl text-foreground placeholder:text-muted/50 focus:outline-none focus:border-zinc-700 text-sm" />
              <textarea placeholder="One line about your music taste..." value={bio} maxLength={160} rows={2}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-4 py-3 bg-input border border-border rounded-xl text-foreground placeholder:text-muted/50 focus:outline-none focus:border-zinc-700 text-sm resize-none" />
              <p className="text-right text-[11px] text-zinc-800">{bio.length}/160</p>
            </div>

            {error && <p className="text-sm text-red-400 text-center mb-3">{error}</p>}

            <button onClick={handleSignUp} disabled={loading}
              className="w-full py-3.5 bg-accent text-white font-medium rounded-xl hover:bg-accent-hover disabled:opacity-30">
              {loading ? "Creating your world..." : "Create account"}
            </button>

            <button onClick={() => { setBio(""); setDisplayName(""); handleSignUp(); }}
              className="w-full py-2 text-zinc-700 text-sm mt-2 hover:text-zinc-400 transition-colors">
              Skip this step
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
