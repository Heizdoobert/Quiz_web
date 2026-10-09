import React, { useState } from "react";
import { User, KeyRound, Loader2 } from "lucide-react";
import {
  signInWithUsername,
  signUpWithUsername,
} from "@/lib/actions/auth-actions";
type AuthMode = "login" | "register";

export interface UsernameTabProps {
  mode: AuthMode;
  onSuccess: () => void;
  refresh: () => Promise<unknown>;
}

export function UsernameTab({ mode, onSuccess, refresh }: UsernameTabProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUsernameAuth = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);

    const action = mode === "login" ? signInWithUsername : signUpWithUsername;
    const res = await action(username, password);

    setPending(false);
    if (!res.ok) {
      setError(
        res.error ||
          (mode === "login"
            ? "Failed to sign in."
            : "Failed to create account."),
      );
      return;
    }

    await refresh();
    onSuccess();
  };

  return (
    <form onSubmit={handleUsernameAuth} className="space-y-4">
      <div className="space-y-3">
        <div>
          <label htmlFor="auth-username" className="block text-xs font-bold text-slate-300 mb-1">
            Username
          </label>
          <div className="relative">
            <input
              id="auth-username"
              type="text"
              required
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. quiz_champ"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-cyber-violet border border-cyber-border text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-neo-mint/60"
            />
            <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          </div>
        </div>

        <div>
          <label htmlFor="auth-password" className="block text-xs font-bold text-slate-300 mb-1">
            Password
          </label>
          <div className="relative">
            <input
              id="auth-password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-cyber-violet border border-cyber-border text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-neo-mint/60"
            />
            <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed bg-cyber-violet/60 p-2.5 rounded-lg border border-cyber-border/40">
        Pick a username and password to save your score and join the leaderboard.
      </p>

      {error && (
        <p role="alert" className="text-xs text-pop-coral font-medium">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !username.trim() || password.length < 6}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-linear-to-r from-neo-mint to-electric-indigo disabled:opacity-40 text-deep-space rounded-xl font-black text-sm cursor-pointer shadow-md hover:opacity-95 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        {pending && <Loader2 className="w-4 h-4 animate-spin" />}
        {mode === "login" ? "Sign in" : "Create account"}
      </button>
    </form>
  );
}
