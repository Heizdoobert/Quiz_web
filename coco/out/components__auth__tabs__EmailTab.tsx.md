# components/auth/tabs/EmailTab.tsx
lines:145 exports:EmailTabProps,EmailTab
---
import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { requestEmailCode, verifyEmailCode } from "@/lib/actions/auth";

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
