"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Step = "welcome" | "email" | "password" | "username";

export default function SignUpPage() {
  const [step, setStep] = useState<Step>("welcome");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignUp() {
    setError(null);
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setError("Username must be 3-20 characters (letters, numbers, underscores)");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // Check username
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .single();

    if (existing) {
      setError("Username is taken");
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

    router.push("/feed");
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-background">
      <div className="w-full max-w-sm">

        {/* Step 1: Welcome */}
        {step === "welcome" && (
          <div className="text-center">
            <h1 className="font-display text-5xl mb-4">Hello,</h1>
            <h1 className="font-display text-5xl text-accent mb-8">Musical Maven!</h1>
            <p className="text-muted text-sm mb-12">
              Your music taste deserves a home.
            </p>
            <button
              onClick={() => setStep("email")}
              className="w-full py-3 bg-accent text-white font-medium rounded-full hover:bg-accent-hover transition-colors text-lg"
            >
              Get Started
            </button>
            <p className="text-center text-sm text-muted mt-6">
              Already have an account?{" "}
              <Link href="/login" className="text-accent hover:underline">Log in</Link>
            </p>
          </div>
        )}

        {/* Step 2: Email */}
        {step === "email" && (
          <div>
            <button onClick={() => setStep("welcome")} className="text-muted text-sm mb-6 hover:text-foreground">
              ← Back
            </button>
            <h2 className="font-display text-3xl mb-2">What&apos;s your email?</h2>
            <p className="text-muted text-sm mb-6">We&apos;ll use this to create your account.</p>
            <input
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted/30 focus:outline-none focus:border-accent transition-colors text-lg"
            />
            <button
              onClick={() => email.includes("@") ? setStep("password") : setError("Enter a valid email")}
              disabled={!email.includes("@")}
              className="w-full py-3 mt-4 bg-accent text-white font-medium rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-40"
            >
              Continue
            </button>
            {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
          </div>
        )}

        {/* Step 3: Password */}
        {step === "password" && (
          <div>
            <button onClick={() => setStep("email")} className="text-muted text-sm mb-6 hover:text-foreground">
              ← Back
            </button>
            <h2 className="font-display text-3xl mb-2">Set a password</h2>
            <p className="text-muted text-sm mb-6">At least 6 characters.</p>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted/30 focus:outline-none focus:border-accent transition-colors text-lg"
            />
            <button
              onClick={() => password.length >= 6 ? setStep("username") : setError("Password must be at least 6 characters")}
              disabled={password.length < 6}
              className="w-full py-3 mt-4 bg-accent text-white font-medium rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-40"
            >
              Continue
            </button>
            {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
          </div>
        )}

        {/* Step 4: Username */}
        {step === "username" && (
          <div>
            <button onClick={() => setStep("password")} className="text-muted text-sm mb-6 hover:text-foreground">
              ← Back
            </button>
            <h2 className="font-display text-3xl mb-2">Pick a username</h2>
            <p className="text-muted text-sm mb-6">This is how people will find you.</p>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-accent text-lg">@</span>
              <input
                type="text"
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                autoFocus
                maxLength={20}
                className="w-full pl-9 pr-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted/30 focus:outline-none focus:border-accent transition-colors text-lg"
              />
            </div>
            <button
              onClick={handleSignUp}
              disabled={loading || username.length < 3}
              className="w-full py-3 mt-4 bg-accent text-white font-medium rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-40"
            >
              {loading ? "Creating your world..." : "Create Account"}
            </button>
            {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
