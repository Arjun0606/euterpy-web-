"use client";

import { useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/feed";

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push(redirect);
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Soft accent glow at top */}
      <div className="absolute top-0 right-0 w-[600px] h-[500px] bg-accent/[0.06] rounded-full blur-[140px] -z-0 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 py-12 sm:py-16 min-h-screen flex flex-col">
        {/* Top brand bar */}
        <div className="mb-12">
          <Link href="/" className="font-display text-2xl tracking-tight text-foreground hover:text-accent transition-colors">
            Euterpy
          </Link>
        </div>

        {/* Two-column hero — editorial left, form right */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-12 lg:gap-20 items-center">
          {/* LEFT — editorial welcome */}
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-accent font-semibold mb-5">— Welcome back</p>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl tracking-tighter leading-[0.92] mb-6">
              The room is <span className="italic text-accent">still here.</span>
            </h1>
            <p className="editorial italic text-base sm:text-lg text-zinc-400 leading-[1.65] max-w-md">
              Your three are still on the wall, your stories still on the table,
              and the people you follow are still writing. Sign in.
            </p>
          </div>

          {/* RIGHT — the form */}
          <div className="w-full max-w-md mx-auto lg:mx-0">
            <div className="bg-card border border-border rounded-3xl p-7 sm:p-9">
              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-6">— Log in</p>

              <form onSubmit={handleLogin} className="space-y-3">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-4 py-3.5 bg-background border border-border rounded-xl text-foreground placeholder:text-zinc-700 focus:outline-none focus:border-accent/40 transition-colors"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3.5 bg-background border border-border rounded-xl text-foreground placeholder:text-zinc-700 focus:outline-none focus:border-accent/40 transition-colors"
                />

                {error && <p className="text-sm text-red-400 italic">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-accent text-white font-medium rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-50 mt-2"
                >
                  {loading ? "Logging in..." : "Log in"}
                </button>
              </form>

              <p className="text-center text-sm text-zinc-500 mt-8">
                New here?{" "}
                <Link href="/signup" className="text-accent hover:underline">
                  Make a page
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
