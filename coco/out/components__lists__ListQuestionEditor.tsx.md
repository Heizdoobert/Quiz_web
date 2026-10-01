# components/lists/ListQuestionEditor.tsx
lines:158 exports:QuestionFormValues,default
---
'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

export interface QuestionFormValues {
  prompt: string;
  options: string[];
  correctIndex: number;
  category: string;
  explanation: string;
}

interface ListQuestionEditorProps {
  initial?: QuestionFormValues;
  submitLabel: string;
  onSubmit: (values: QuestionFormValues) => Promise<{ success: boolean; error?: string }>;
  onDone: () => void;
  onCancel?: () => void;
}

const EMPTY: QuestionFormValues = {
  prompt: '',
  options: ['', '', '', ''],
  correctIndex: 0,
  category: 'General',
  explanation: '',
};

export default function ListQuestionEditor({
  initial,
  submitLabel,
  onSubmit,
  onDone,
  onCancel,
}: ListQuestionEditorProps) {
  const [values, setValues] = useState<QuestionFormValues>(initial || EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

