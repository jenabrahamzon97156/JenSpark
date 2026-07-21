"use client";

// components/auth/LoginForm.tsx
//
// Deliberately bare-bones: this app has exactly one intended user, so there's
// no "forgot password" flow, no social login, no onboarding copy. Just enough
// to keep the data behind a real account instead of a public URL.

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"sign_in" | "sign_up">("sign_in");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    const { error } =
      mode === "sign_in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (mode === "sign_up") {
      setInfo("Check your email to confirm your account, then sign in.");
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] p-6"
      >
        <h1 className="text-lg font-medium text-[#1D2027] mb-1">
          JenSpark
        </h1>
        <p className="text-sm text-[#6B7280] mb-5">
          {mode === "sign_in" ? "Sign in to your log" : "Create your account"}
        </p>

        <label className="block text-xs text-[#6B7280] mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-3 bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
          placeholder="you@example.com"
        />

        <label className="block text-xs text-[#6B7280] mb-1">Password</label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-3 py-2 text-sm text-[#1D2027] focus:outline-none focus:border-[#0D9488]"
          placeholder="••••••••"
        />

        {error && (
          <p className="text-sm text-[#DC2626] mb-3">{error}</p>
        )}
        {info && (
          <p className="text-sm text-[#16A34A] mb-3">{info}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-[#0D9488] text-white text-sm font-medium py-2 disabled:opacity-60"
        >
          {loading
            ? "Please wait..."
            : mode === "sign_in"
            ? "Sign in"
            : "Sign up"}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode((m) => (m === "sign_in" ? "sign_up" : "sign_in"));
            setError(null);
            setInfo(null);
          }}
          className="w-full text-xs text-[#6B7280] mt-3 hover:text-[#1D2027]"
        >
          {mode === "sign_in"
            ? "First time here? Create an account"
            : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
