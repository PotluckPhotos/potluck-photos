"use client";

import { createClient } from "@/lib/supabase/client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { card, input, primaryButton, ghostButton } from "@/lib/ui";
import { GoogleG, Eye, EyeOff } from "@/components/icons";
import { safeNext } from "@/lib/safe-next";

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
  const next = safeNext(searchParams.get("next"));
  const [mode, setMode] = useState<Mode>(searchParams.get("mode") === "signup" ? "sign-up" : "sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          data: { display_name: name.trim() },
        },
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
      <div style={{ maxWidth: 380, margin: "44px auto 0", padding: "0 20px" }}>
        <div style={{ ...card, textAlign: "center" }}>
          <p style={{ margin: 0 }}>Check your email to confirm your account before signing in.</p>
        </div>
      </div>
    );
  }

  const isSignUp = mode === "sign-up";

  return (
    <div style={{ maxWidth: 380, margin: "24px auto 0", padding: "0 20px" }}>
      <div style={card}>
        <h1 style={{ fontFamily: "var(--font-head)", fontSize: 26, fontWeight: 700, margin: "0 0 4px", textAlign: "center" }}>
          {isSignUp ? "Create your account" : "Welcome back"}
        </h1>
        <p style={{ margin: "0 0 20px", fontSize: 13.5, color: "var(--text-secondary)", textAlign: "center" }}>
          {isSignUp ? "Start collecting photos from your people" : "Sign in to see your albums"}
        </p>

        <button onClick={handleGoogle} style={{ ...ghostButton, width: "100%", marginBottom: 14 }}>
          <GoogleG size={16} style={{ marginRight: 2 }} />
          Continue with Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0", color: "var(--text-muted)", fontSize: 12 }}>
          <div style={{ flex: 1, height: 1, background: "var(--hairline)" }} />
          or
          <div style={{ flex: 1, height: 1, background: "var(--hairline)" }} />
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {isSignUp && (
            <input type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required style={input} />
          )}
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={input} />
          <PasswordField
            placeholder="Password"
            value={password}
            onChange={(v) => setPassword(v)}
            show={showPassword}
            onToggle={() => setShowPassword((s) => !s)}
          />
          {isSignUp && (
            <PasswordField
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(v) => setConfirmPassword(v)}
              show={showPassword}
              onToggle={() => setShowPassword((s) => !s)}
            />
          )}
          {error && <p style={{ color: "var(--text-danger)", margin: 0, fontSize: 13.5 }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ ...primaryButton, width: "100%", opacity: loading ? 0.7 : 1 }}>
            {isSignUp ? "Create account" : "Sign in"}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(isSignUp ? "sign-in" : "sign-up");
            setError(null);
          }}
          style={{ width: "100%", marginTop: 16, background: "none", border: "none", color: "var(--accent)", fontSize: 13.5, cursor: "pointer", fontWeight: 600 }}
        >
          {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
        </button>
      </div>
    </div>
  );
}

function PasswordField({
  placeholder,
  value,
  onChange,
  show,
  onToggle,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <div style={{ position: "relative" }}>
      <input
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        minLength={8}
        required
        style={{ ...input, paddingRight: 42 }}
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={show ? "Hide password" : "Show password"}
        style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex", padding: 4 }}
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
