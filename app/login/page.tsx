"use client";

import { useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";

type Mode = "login" | "signup";
type Screen = "form" | "email_sent";

function translateError(msg: string): string {
  if (msg.includes("Invalid login credentials")) return "メールアドレスまたはパスワードが間違っています。";
  if (msg.includes("Email not confirmed")) return "メールアドレスの確認が完了していません。届いたメールのリンクをクリックしてください。";
  if (msg.includes("User already registered")) return "このメールアドレスはすでに登録済みです。ログインしてください。";
  if (msg.includes("Password should be at least")) return "パスワードは8文字以上で設定してください。";
  if (msg.includes("provider is not enabled")) return "Googleログインはまだ設定中です。メールアドレスでログインしてください。";
  if (msg.includes("rate limit")) return "試行回数が多すぎます。しばらく待ってから再試行してください。";
  return msg;
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("login");
  const [screen, setScreen] = useState<Screen>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // URLパラメータにerrorがあれば表示
  const urlError = searchParams.get("error");

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${location.origin}/auth/callback`,
        },
      });
      if (error) {
        setError(translateError(error.message));
      } else {
        setScreen("email_sent");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(translateError(error.message));
      } else {
        const next = searchParams.get("next") ?? "/";
        router.push(next);
        router.refresh();
      }
    }

    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    if (error) {
      setError(translateError(error.message));
      setLoading(false);
    }
    // エラーなしの場合はGoogleのページにリダイレクトされるので loading はそのまま
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setScreen("form");
  };

  // ─── メール送信完了画面 ───
  if (screen === "email_sent") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="bg-background-card border border-border-light rounded-3xl shadow-sm p-10">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" className="text-primary" viewBox="0 0 16 16">
                <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1zm13 2.383-4.708 2.825L15 11.105zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741M1 11.105l4.708-2.897L1 5.383z"/>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-text-main mb-2">確認メールを送信しました</h2>
            <p className="text-sm text-text-sub mb-1">
              <span className="font-bold text-text-main">{email}</span> に確認メールを送りました。
            </p>
            <p className="text-sm text-text-sub mb-8">
              メール内の「メールアドレスを確認する」リンクをクリックすると、ログインが完了します。
            </p>

            <div className="bg-background-soft rounded-2xl p-4 text-left text-xs text-text-sub space-y-2 mb-6">
              <p className="font-bold text-text-main text-sm">届かない場合は</p>
              <p>• 迷惑メールフォルダをご確認ください</p>
              <p>• <span className="font-medium">noreply@mail.app.supabase.io</span> からのメールを探してください</p>
              <p>• しばらく待ってから再試行してください</p>
            </div>

            <button
              onClick={() => { setScreen("form"); setMode("login"); }}
              className="w-full py-3 rounded-full border-2 border-border-light text-text-main font-bold text-sm hover:border-primary hover:text-primary transition-all"
            >
              ログイン画面に戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── メインフォーム画面 ───
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-background-card border border-border-light rounded-3xl shadow-sm p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <img src="/icons/cat.png" className="w-12 h-12 object-contain mb-3" alt="Gift for" />
            <h1 className="text-2xl font-bold text-text-main">Gift for</h1>
            <p className="text-sm text-text-sub mt-1">ギフト体験をシェアしよう</p>
          </div>

          {/* URL error (OAuth callback error) */}
          {urlError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 border border-red-200 text-sm">
              ログインに失敗しました。もう一度お試しください。
            </div>
          )}

          {/* Tab switcher */}
          <div className="flex bg-background-soft rounded-2xl p-1 mb-6">
            <button
              onClick={() => switchMode("login")}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                mode === "login" ? "bg-white text-text-main shadow-sm" : "text-text-sub hover:text-text-main"
              }`}
            >
              ログイン
            </button>
            <button
              onClick={() => switchMode("signup")}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                mode === "signup" ? "bg-white text-text-main shadow-sm" : "text-text-sub hover:text-text-main"
              }`}
            >
              新規登録
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 border border-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Google OAuth */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-full border-2 border-border-light bg-white text-text-main font-bold text-sm hover:border-primary/50 hover:shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed mb-4"
          >
            {loading ? (
              <svg className="animate-spin w-4 h-4 text-text-sub" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
            )}
            Googleでログイン / 登録
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-border-light" />
            <span className="text-xs text-text-sub">またはメールアドレスで</span>
            <div className="flex-1 h-px bg-border-light" />
          </div>

          {/* Email form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-text-main mb-1.5">メールアドレス</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-background-soft border border-border-light rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:bg-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-text-main mb-1.5">パスワード</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "8文字以上" : "パスワード"}
                minLength={mode === "signup" ? 8 : undefined}
                className="w-full bg-background-soft border border-border-light rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary focus:bg-white transition-colors"
              />
            </div>

            {mode === "signup" && (
              <p className="text-xs text-text-sub bg-background-soft rounded-xl p-3">
                登録後、確認メールが届きます。メール内のリンクをクリックするとアカウントが有効になります。
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-full bg-primary text-white font-bold shadow-sm hover:bg-primary-hover transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "処理中..." : mode === "login" ? "ログイン" : "確認メールを送る"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
