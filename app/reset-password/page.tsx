"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const router = useRouter();

  // PASSWORD_RECOVERY イベントが来るまでフォームを見せない
  const [isRecovery, setIsRecovery] = useState(false);
  const [checking, setChecking] = useState(true);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabaseが PASSWORD_RECOVERY イベントを発行するのを待つ
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
        setChecking(false);
      }
    });

    // タイムアウト: 5秒以内にイベントが来なければ不正アクセスとみなす
    const timeout = setTimeout(() => {
      setChecking(false);
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("パスワードが一致しません。"); return; }
    if (password.length < 8) { setError("パスワードは8文字以上で設定してください。"); return; }

    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // パスワード変更後は全デバイスのセッションを無効化
    await supabase.auth.signOut({ scope: "global" });
    setDone(true);
  };

  // ─── 完了画面 ───
  if (done) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="bg-background-card border border-border-light rounded-3xl shadow-sm p-10">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" className="text-primary" viewBox="0 0 16 16">
                <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0"/>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-text-main mb-2">パスワードを変更しました</h2>
            <p className="text-sm text-text-sub mb-2">セキュリティのため、すべてのデバイスからサインアウトしました。</p>
            <p className="text-sm text-text-sub mb-8">新しいパスワードで再度ログインしてください。</p>
            <button
              onClick={() => router.push("/login")}
              className="w-full py-3 rounded-full bg-primary text-white font-bold text-sm hover:bg-primary-hover transition-all"
            >
              ログイン画面へ
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── 確認中 ───
  if (checking) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ─── 不正アクセス（リセットリンク経由でない） ───
  if (!isRecovery) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="bg-background-card border border-border-light rounded-3xl shadow-sm p-10">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" className="text-red-400" viewBox="0 0 16 16">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
                <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-text-main mb-2">無効なリンクです</h2>
            <p className="text-sm text-text-sub mb-8">パスワード再設定リンクの有効期限が切れているか、すでに使用済みです。もう一度やり直してください。</p>
            <button
              onClick={() => router.push("/login")}
              className="w-full py-3 rounded-full bg-primary text-white font-bold text-sm hover:bg-primary-hover transition-all"
            >
              ログイン画面へ
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── パスワード変更フォーム ───
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-background-card border border-border-light rounded-3xl shadow-sm p-8">
          <div className="flex flex-col items-center mb-8">
            <img src="/icons/cat.png" className="w-12 h-12 object-contain mb-3" alt="Gift for" />
            <h1 className="text-xl font-bold text-text-main">新しいパスワードを設定</h1>
            <p className="text-sm text-text-sub mt-1">8文字以上で設定してください</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 border border-red-200 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-text-main mb-1.5">新しいパスワード</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8文字以上"
                  minLength={8}
                  className="w-full bg-background-soft border border-border-light rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:border-primary focus:bg-white transition-colors"
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-sub hover:text-text-main transition-colors">
                  {showPw ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="m10.79 12.912-1.614-1.615a3.5 3.5 0 0 1-4.474-4.474l-2.06-2.06C.938 6.278 0 8 0 8s3 5.5 8 5.5a7 7 0 0 0 2.79-.588M5.21 3.088A7 7 0 0 1 8 2.5c5 0 8 5.5 8 5.5s-.939 1.721-2.641 3.238l-2.062-2.062a3.5 3.5 0 0 0-4.474-4.474zM5.525 7.646a2.5 2.5 0 0 0 2.829 2.829zm4.95.708-2.829-2.83a2.5 2.5 0 0 1 2.829 2.829zm3.171 6-12-12 .708-.708 12 12z"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z"/><path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"/></svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-text-main mb-1.5">パスワードの確認</label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="もう一度入力"
                  className="w-full bg-background-soft border border-border-light rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:border-primary focus:bg-white transition-colors"
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-sub hover:text-text-main transition-colors">
                  {showConfirm ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="m10.79 12.912-1.614-1.615a3.5 3.5 0 0 1-4.474-4.474l-2.06-2.06C.938 6.278 0 8 0 8s3 5.5 8 5.5a7 7 0 0 0 2.79-.588M5.21 3.088A7 7 0 0 1 8 2.5c5 0 8 5.5 8 5.5s-.939 1.721-2.641 3.238l-2.062-2.062a3.5 3.5 0 0 0-4.474-4.474zM5.525 7.646a2.5 2.5 0 0 0 2.829 2.829zm4.95.708-2.829-2.83a2.5 2.5 0 0 1 2.829 2.829zm3.171 6-12-12 .708-.708 12 12z"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z"/><path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"/></svg>
                  )}
                </button>
              </div>
            </div>

            {/* パスワード強度インジケーター */}
            {password.length > 0 && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[...Array(4)].map((_, i) => {
                    const strength = password.length >= 12 ? 4 : password.length >= 10 ? 3 : password.length >= 8 ? 2 : 1;
                    return (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                        i < strength
                          ? strength <= 1 ? 'bg-red-400' : strength <= 2 ? 'bg-yellow-400' : strength <= 3 ? 'bg-blue-400' : 'bg-green-400'
                          : 'bg-border-light'
                      }`} />
                    );
                  })}
                </div>
                <p className="text-[10px] text-text-sub">
                  {password.length < 8 ? '短すぎます' : password.length < 10 ? '普通' : password.length < 12 ? '強い' : 'とても強い'}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-full bg-primary text-white font-bold shadow-sm hover:bg-primary-hover transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "変更中..." : "パスワードを変更する"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
