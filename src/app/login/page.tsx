"use client";

import { createClient } from "@/lib/supabase/client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

type Mode = "sign-in" | "sign-up";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleGoogle() {
    setError(null);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "sign-up" && password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);

    if (mode === "sign-up") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      setCheckEmail(true);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      window.location.href = next;
    }
  }

  if (checkEmail) {
    return (
      <div style={{ maxWidth: 360, margin: "4rem auto", textAlign: "center" }}>
        <p>Check your email to confirm your account before signing in.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 360, margin: "4rem auto" }}>
      <button onClick={handleGoogle} style={{ width: "100%", marginBottom: 16 }}>
        Continue with Google
      </button>

      <div style={{ textAlign: "center", margin: "16px 0", color: "var(--text-secondary)" }}>or</div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
        {mode === "sign-up" && (
          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={8}
            required
          />
        )}
        {error && <p style={{ color: "var(--text-danger)" }}>{error}</p>}
        <button type="submit" disabled={loading}>
          {mode === "sign-up" ? "Create account" : "Sign in"}
        </button>
      </form>

      <button
        onClick={() => {
          setMode(mode === "sign-in" ? "sign-up" : "sign-in");
          setError(null);
        }}
        style={{ width: "100%", marginTop: 16 }}
      >
        {mode === "sign-in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
