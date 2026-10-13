import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { requestEmailCode, verifyEmailCode } from "@/lib/actions/auth-actions";

type EmailStep = "input" | "code";

const SEND_ERRORS = {
  RATE_LIMITED: "Too many requests. Please try again later.",
  INVALID_USERNAME: "Username must be 3-20 characters (letters, numbers, underscores).",
  USERNAME_TAKEN: "Username is already taken.",
};

export interface EmailTabProps {
  mode?: "login" | "register";
  onSuccess: () => void;
  refresh: () => Promise<unknown>;
}

export function EmailTab({ mode = "login", onSuccess, refresh }: EmailTabProps) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [emailStep, setEmailStep] = useState<EmailStep>("input");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendCode = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await requestEmailCode(email, mode === "register" ? username : undefined);
    setPending(false);
    if (res.error) {
      setError(SEND_ERRORS[res.error]);
      return;
    }
    setEmailStep("code");
  };

  const handleVerify = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await verifyEmailCode(email, code);
    setPending(false);
    if (!res.ok) {
      setError(
        res.error === "RATE_LIMITED"
          ? "Too many attempts. Please try again later."
          : "Wrong or expired code. Try again."
      );
      return;
    }
    await refresh();
    onSuccess();
  };

  if (emailStep === "input") {
    return (
      <form onSubmit={handleSendCode} className="space-y-4">
        <p className="text-xs text-slate-400">
          {mode === "register"
            ? "Pick a username and we email you a 6-digit code to create your account."
            : "We email you a 6-digit code to sign in."}
        </p>
        {mode === "register" && (
          <input
            type="text"
            required
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            aria-label="Username"
            placeholder="e.g. quiz_champ"
            className="w-full px-4 py-2.5 rounded-xl bg-cyber-violet border border-cyber-border text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-neo-mint/60"
          />
        )}
        <input
          type="email"
          required
          autoFocus={mode === "login"}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Email address"
          placeholder="you@example.com"
          className="w-full px-4 py-2.5 rounded-xl bg-cyber-violet border border-cyber-border text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-neo-mint/60"
        />
        {error && (
          <p role="alert" className="text-xs text-pop-coral">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-linear-to-r from-neo-mint to-electric-indigo disabled:opacity-40 text-deep-space rounded-xl font-black text-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {pending && <Loader2 className="w-4 h-4 animate-spin" />} Send code
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleVerify} className="space-y-4">
      <p className="text-sm text-slate-300">
        Enter the 6-digit code sent to {email}.
      </p>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]{6}"
        maxLength={6}
        required
        autoFocus
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        aria-label="6-digit code"
        placeholder="123456"
        className="w-full px-4 py-2.5 rounded-xl bg-cyber-violet border border-cyber-border text-sm text-white tracking-[0.3em] text-center placeholder:text-slate-500 focus:outline-none focus:border-neo-mint/60"
      />
      {error && (
        <p role="alert" className="text-xs text-pop-coral">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending || code.length !== 6}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-linear-to-r from-neo-mint to-electric-indigo disabled:opacity-40 text-deep-space rounded-xl font-black text-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        {pending && <Loader2 className="w-4 h-4 animate-spin" />} Verify
      </button>
      <div className="text-center pt-1">
        <button
          type="button"
          onClick={() => setEmailStep("input")}
          className="text-xs text-slate-400 hover:text-white cursor-pointer focus-visible:outline-none focus-visible:underline"
        >
          ← Use different email
        </button>
      </div>
    </form>
  );
}
