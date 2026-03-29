'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';

const STORAGE_KEY = 'onboarding-complete';

type Step = 'welcome' | 'login' | 'notifications' | 'done';

function translateError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'メールアドレスまたはパスワードが間違っています。';
  if (msg.includes('User already registered')) return 'このメールアドレスはすでに登録済みです。';
  if (msg.includes('Password should be at least')) return 'パスワードは8文字以上で設定してください。';
  return msg;
}

export default function Onboarding() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<Step>('welcome');
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    setVisible(true);

    import(/* webpackIgnore: true */ '@capacitor/core').then(({ Capacitor }) => {
      setIsIos(Capacitor.getPlatform() === 'ios');
    }).catch(() => {});
  }, []);

  const complete = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  const goNext = (current: Step) => {
    if (current === 'welcome') { setStep('login'); return; }
    if (current === 'login') { isIos ? setStep('notifications') : complete(); return; }
    if (current === 'notifications') { complete(); return; }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col overflow-hidden">
      <AnimatePresence mode="wait">
        {step === 'welcome' && (
          <WelcomeStep key="welcome" onNext={() => goNext('welcome')} />
        )}
        {step === 'login' && (
          <LoginStep key="login" onNext={() => goNext('login')} onSkip={() => goNext('login')} />
        )}
        {step === 'notifications' && (
          <NotificationsStep key="notifications" onNext={() => goNext('notifications')} />
        )}
      </AnimatePresence>
    </div>
  );
}

const slideVariants = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

/* ─── Step 1: ようこそ ─── */
function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <motion.div
      variants={slideVariants} initial="initial" animate="animate" exit="exit"
      transition={{ duration: 0.3 }}
      className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-8"
    >
      <img src="/icons/cat.png" className="w-20 h-20 object-contain" alt="Gift for" />
      <div className="space-y-3">
        <h1 className="text-3xl font-bold text-text-main">Gift for</h1>
        <p className="text-text-sub leading-relaxed">
          実体験に基づいた「成功したギフト体験」を<br />可視化・共有するサービスです。
        </p>
      </div>
      <div className="w-full max-w-xs space-y-3">
        <div className="flex items-center gap-3 bg-background-soft rounded-2xl p-4 text-left">
          <span className="text-2xl">🎁</span>
          <p className="text-sm text-text-main font-medium">先輩の経験からギフトを選べる</p>
        </div>
        <div className="flex items-center gap-3 bg-background-soft rounded-2xl p-4 text-left">
          <span className="text-2xl">✨</span>
          <p className="text-sm text-text-main font-medium">自分の体験をシェアできる</p>
        </div>
        <div className="flex items-center gap-3 bg-background-soft rounded-2xl p-4 text-left">
          <span className="text-2xl">📋</span>
          <p className="text-sm text-text-main font-medium">シーン別まとめリストを作れる</p>
        </div>
      </div>
      <button
        onClick={onNext}
        className="w-full max-w-xs py-4 rounded-full bg-primary text-white font-bold text-lg shadow-lg hover:bg-primary-hover transition-all"
      >
        はじめる
      </button>
    </motion.div>
  );
}

/* ─── Step 2: ログイン ─── */
function LoginStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const supabase = createClient();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const handleGoogle = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    setLoading(false);
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${location.origin}/auth/callback` },
      });
      if (error) setError(translateError(error.message));
      else setEmailSent(true);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(translateError(error.message));
      else onNext();
    }
    setLoading(false);
  };

  if (emailSent) {
    return (
      <motion.div variants={slideVariants} initial="initial" animate="animate" exit="exit"
        transition={{ duration: 0.3 }}
        className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-6">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" className="text-primary" viewBox="0 0 16 16">
            <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1zm13 2.383-4.708 2.825L15 11.105zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741M1 11.105l4.708-2.897L1 5.383z"/>
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-text-main">確認メールを送信しました</h2>
          <p className="text-sm text-text-sub">{email} に確認メールを送りました。<br />メール内のリンクをクリックしてください。</p>
        </div>
        <button onClick={onSkip} className="w-full max-w-xs py-3 rounded-full border border-border-light text-text-sub font-bold text-sm hover:border-primary hover:text-primary transition-all">
          あとで確認する
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div variants={slideVariants} initial="initial" animate="animate" exit="exit"
      transition={{ duration: 0.3 }}
      className="flex-1 flex flex-col px-6 py-8 overflow-y-auto">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full gap-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-text-main">ログイン / 登録</h2>
          <p className="text-sm text-text-sub mt-1">アカウントがあると口コミを投稿・保存できます</p>
        </div>

        {/* Tab */}
        <div className="flex bg-background-soft rounded-2xl p-1">
          {(['login', 'signup'] as const).map((m) => (
            <button key={m} onClick={() => { setMode(m); setError(null); }}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${mode === m ? 'bg-white text-text-main shadow-sm' : 'text-text-sub'}`}>
              {m === 'login' ? 'ログイン' : '新規登録'}
            </button>
          ))}
        </div>

        {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>}

        {/* Google */}
        <button onClick={handleGoogle} disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-full border-2 border-border-light bg-white font-bold text-sm hover:border-primary/50 transition-all disabled:opacity-60">
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          Googleでログイン / 登録
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border-light" />
          <span className="text-xs text-text-sub">またはメールで</span>
          <div className="flex-1 h-px bg-border-light" />
        </div>

        <form onSubmit={handleEmail} className="space-y-3">
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full bg-background-soft border border-border-light rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors" />
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
            placeholder={mode === 'signup' ? 'パスワード（8文字以上）' : 'パスワード'}
            minLength={mode === 'signup' ? 8 : undefined}
            className="w-full bg-background-soft border border-border-light rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors" />
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-full bg-primary text-white font-bold shadow-sm hover:bg-primary-hover transition-all disabled:opacity-60">
            {loading ? '処理中...' : mode === 'login' ? 'ログイン' : '確認メールを送る'}
          </button>
        </form>

        <button onClick={onSkip} className="text-sm text-text-sub hover:text-primary transition-colors font-bold text-center">
          スキップ（あとでログイン）
        </button>
      </div>
    </motion.div>
  );
}

/* ─── Step 3: 通知（iOS のみ） ─── */
function NotificationsStep({ onNext }: { onNext: () => void }) {
  const [requesting, setRequesting] = useState(false);

  const requestPermission = async () => {
    setRequesting(true);
    try {
      const { PushNotifications } = await import(/* webpackIgnore: true */ '@capacitor/push-notifications');
      const { receive } = await PushNotifications.requestPermissions();
      if (receive === 'granted') await PushNotifications.register();
    } catch (e) {
      console.error(e);
    } finally {
      onNext();
    }
  };

  return (
    <motion.div variants={slideVariants} initial="initial" animate="animate" exit="exit"
      transition={{ duration: 0.3 }}
      className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-8">
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="currentColor" className="text-primary" viewBox="0 0 16 16">
          <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2M8 1.918l-.797.161A4 4 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4 4 0 0 0-3.203-3.92zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5 5 0 0 1 13 6c0 .88.32 4.2 1.22 6"/>
        </svg>
      </div>
      <div className="space-y-3">
        <h2 className="text-2xl font-bold text-text-main">通知を受け取る</h2>
        <p className="text-text-sub leading-relaxed text-sm">
          いいねやコメントなど、<br />大切なお知らせをプッシュ通知でお届けします。
        </p>
      </div>
      <div className="w-full max-w-xs space-y-3">
        <button onClick={requestPermission} disabled={requesting}
          className="w-full py-4 rounded-full bg-primary text-white font-bold shadow-lg hover:bg-primary-hover transition-all disabled:opacity-60">
          {requesting ? '設定中...' : '通知を許可する'}
        </button>
        <button onClick={onNext}
          className="w-full py-3 rounded-full border border-border-light text-text-sub font-bold text-sm hover:border-primary/40 hover:text-primary transition-all">
          あとで設定する
        </button>
      </div>
    </motion.div>
  );
}
