# components/auth/tabs/EmailTab.tsx
lines:103 exports:EmailTabProps,EmailTab
---
import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { requestEmailCode, verifyEmailCode } from "@/lib/actions/auth-actions";
import { NO_WALLET_DISCLOSURE } from "@/lib/constants/rewards-copy";

type EmailStep = "input" | "code";

export interface EmailTabProps {
  onSuccess: () => void;
  refresh: () => Promise<unknown>;
}

export function EmailTab({ onSuccess, refresh }: EmailTabProps) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [emailStep, setEmailStep] = useState<EmailStep>("input");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendCode = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    await requestEmailCode(email);
    setPending(false);
    setEmailStep("code");
  };

  const handleVerify = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await verifyEmailCode(email, code);
    setPending(false);
    if (!res.ok) {
      setError("Wrong or expired code. Try again.");
      return;
    }
    await refresh();
    onSuccess();
