"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Step = "welcome" | "email" | "otp" | "username";

export default function SignUpPage() {
  const [step, setStep] = useState<Step>("welcome");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSendOtp() {
    if (!email.includes("@")) {
      setError("Enter a valid email");
      return;
    }
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({ email });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setStep("otp");
  }

  async function handleVerifyOtp() {
    if (otp.length < 6) {
      setError("Enter the 6-digit code");
      return;
    }
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setStep("username");
  }

  async function handleSetUsername() {
    setError(null);
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setError("Username must be 3-20 characters (letters, numbers, underscores)");
      return;
    }

    setLoading(true);

    // Check username availability
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

    // Claim username
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ username }).eq("id", user.id);
    }

    router.push("/welcome");
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-background">
      <div className="w-full max-w-sm">

        {/* Step 1: Welcome + Email */}
        {step === "welcome" && (
          <div>
            <div className="text-center mb-10">
              <h1 className="font-display text-5xl mb-2">Hello,</h1>
              <h1 className="font-display text-5xl text-accent">Musical Maven!</h1>
            </div>
            <p className="text-muted text-sm mb-8 text-center">
              Your music taste deserves a home. Enter your email to get started.
            </p>
            <input
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
              className="w-full px-4 py-3.5 bg-card border border-border rounded-xl text-foreground placeholder:text-muted/30 focus:outline-none focus:border-accent transition-colors text-lg"
            />
            <button
              onClick={handleSendOtp}
              disabled={loading || !email.includes("@")}
              className="w-full py-3.5 mt-4 bg-accent text-white font-medium rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-40 text-base"
            >
              {loading ? "Sending code..." : "Continue"}
            </button>
            {error && <p className="text-sm text-red-400 mt-3 text-center">{error}</p>}
            <p className="text-center text-sm text-muted mt-8">
              Already have an account?{" "}
              <Link href="/login" className="text-accent hover:underline">Log in</Link>
            </p>
          </div>
        )}

        {/* Step 2: OTP Verification */}
        {step === "otp" && (
          <div>
            <button onClick={() => setStep("welcome")} className="text-muted text-sm mb-8 hover:text-foreground">
              ← Back
            </button>
            <h2 className="font-display text-3xl mb-2">Check your email</h2>
            <p className="text-muted text-sm mb-8">
              We sent a 6-digit code to <span className="text-foreground font-medium">{email}</span>
            </p>
            <input
              type="text"
              placeholder="000000"
              value={otp}
              onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(null); }}
              autoFocus
              maxLength={6}
              onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
              className="w-full px-4 py-3.5 bg-card border border-border rounded-xl text-foreground placeholder:text-muted/30 focus:outline-none focus:border-accent transition-colors text-2xl text-center tracking-[0.5em] font-mono"
            />
            <button
              onClick={handleVerifyOtp}
              disabled={loading || otp.length < 6}
              className="w-full py-3.5 mt-4 bg-accent text-white font-medium rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-40"
            >
              {loading ? "Verifying..." : "Verify"}
            </button>
            {error && <p className="text-sm text-red-400 mt-3 text-center">{error}</p>}
            <button
              onClick={handleSendOtp}
              className="w-full text-center text-sm text-muted mt-4 hover:text-accent transition-colors"
            >
              Didn&apos;t get the code? Resend
            </button>
          </div>
        )}

        {/* Step 3: Username */}
        {step === "username" && (
          <div>
            <h2 className="font-display text-3xl mb-2">Pick a username</h2>
            <p className="text-muted text-sm mb-8">This is how people will find you.</p>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-accent text-lg">@</span>
              <input
                type="text"
                placeholder="username"
                value={username}
                onChange={(e) => { setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")); setError(null); }}
                autoFocus
                maxLength={20}
                onKeyDown={(e) => e.key === "Enter" && handleSetUsername()}
                className="w-full pl-9 pr-4 py-3.5 bg-card border border-border rounded-xl text-foreground placeholder:text-muted/30 focus:outline-none focus:border-accent transition-colors text-lg"
              />
            </div>
            <button
              onClick={handleSetUsername}
              disabled={loading || username.length < 3}
              className="w-full py-3.5 mt-4 bg-accent text-white font-medium rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-40"
            >
              {loading ? "Creating your world..." : "Claim @" + (username || "...")}
            </button>
            {error && <p className="text-sm text-red-400 mt-3 text-center">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
