"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Step = "credentials" | "username";

export default function SignUpPage() {
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignUp() {
    setError(null);
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setError("3-20 characters, letters, numbers, underscores only");
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

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/welcome");
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-black">
      <div className="w-full max-w-sm">

        {/* Header */}
        <Link href="/">
          <h1 className="font-display text-5xl text-center mb-3">Euterpy</h1>
        </Link>
        <p className="text-center text-zinc-500 text-sm mb-10">
          {step === "credentials" ? "Create your account" : "Choose your identity"}
        </p>

        {/* Step indicator */}
        <div className="flex gap-2 mb-8">
          <div className={`h-[2px] flex-1 rounded-full ${step === "credentials" ? "bg-accent" : "bg-zinc-800"}`} />
          <div className={`h-[2px] flex-1 rounded-full ${step === "username" ? "bg-accent" : "bg-zinc-800"}`} />
        </div>

        {/* Step 1: Email + Password */}
        {step === "credentials" && (
          <div>
            <div className="space-y-3 mb-4">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                autoFocus
                className="w-full px-4 py-3.5 bg-input border border-border rounded-xl text-foreground placeholder:text-muted/50 focus:outline-none focus:border-zinc-700 transition-colors"
              />
              <input
                type="password"
                placeholder="Password (6+ characters)"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                onKeyDown={(e) => e.key === "Enter" && email.includes("@") && password.length >= 6 && setStep("username")}
                className="w-full px-4 py-3.5 bg-input border border-border rounded-xl text-foreground placeholder:text-muted/50 focus:outline-none focus:border-zinc-700 transition-colors"
              />
            </div>

            {error && <p className="text-sm text-red-400 text-center mb-3">{error}</p>}

            <button
              onClick={() => {
                if (!email.includes("@")) { setError("Enter a valid email"); return; }
                if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
                setError(null);
                setStep("username");
              }}
              disabled={!email.includes("@") || password.length < 6}
              className="w-full py-3.5 bg-accent text-white font-medium rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-30"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: Username */}
        {step === "username" && (
          <div>
            <button onClick={() => setStep("credentials")} className="text-zinc-600 text-sm mb-6 hover:text-zinc-300 transition-colors">
              ← Back
            </button>

            <p className="text-zinc-400 text-sm mb-1">Your profile will live at</p>
            <p className="text-zinc-300 text-sm mb-5 font-mono">
              euterpy.app/<span className="text-accent">{username || "..."}</span>
            </p>

            <div className="relative mb-4">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">@</span>
              <input
                type="text"
                placeholder="username"
                value={username}
                onChange={(e) => { setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")); setError(null); }}
                autoFocus
                maxLength={20}
                onKeyDown={(e) => e.key === "Enter" && username.length >= 3 && handleSignUp()}
                className="w-full pl-9 pr-4 py-3.5 bg-input border border-border rounded-xl text-foreground placeholder:text-muted/50 focus:outline-none focus:border-zinc-700 transition-colors"
              />
            </div>

            {error && <p className="text-sm text-red-400 text-center mb-3">{error}</p>}

            <button
              onClick={handleSignUp}
              disabled={loading || username.length < 3}
              className="w-full py-3.5 bg-accent text-white font-medium rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-30"
            >
              {loading ? "Setting up..." : "Create Account"}
            </button>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-sm text-zinc-600 mt-10">
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
