# components/community/SuggestionForm.tsx
lines:136 exports:default
---
'use client';

import React, { useState } from 'react';
import { Lightbulb, Send, X, Check } from 'lucide-react';
import { addComment } from '@/lib/actions/community-actions';

interface SuggestionFormProps {
  questionId: string;
}

export default function SuggestionForm({ questionId }: SuggestionFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || trimmed.length > 500 || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await addComment(questionId, trimmed, 'suggestion');
      if (res.ok) {
        setSuccess(true);
        setBody('');
        setTimeout(() => {
          setSuccess(false);
          setIsOpen(false);
        }, 2000);
      } else {
        if (res.code === 'NOT_ALLOWED') {
          setError('Authors cannot send suggestions on their own questions.');
        } else if (res.code === 'RATE_LIMITED') {
          setError('Daily limit reached (max 20 comments or suggestions per day).');
        } else if (res.code === 'NOT_ANSWERED') {
