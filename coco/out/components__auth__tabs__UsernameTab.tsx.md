# components/auth/tabs/UsernameTab.tsx
lines:101 exports:UsernameTabProps,UsernameTab
---
import React, { useState } from "react";
import { User, KeyRound, Loader2 } from "lucide-react";
import {
  signInWithUsername,
  signUpWithUsername,
} from "@/lib/actions/auth-actions";
import type { AuthMode } from "../AuthMethodTabs";

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
