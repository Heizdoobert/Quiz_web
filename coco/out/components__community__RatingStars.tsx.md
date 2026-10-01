# components/community/RatingStars.tsx
lines:111 exports:default
---
'use client';

import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { rateQuestion } from '@/lib/actions/community-actions';

interface RatingStarsProps {
  questionId: string;
  average: number;
  count: number;
  myRating: number | null;
  canRate: boolean;
  onRated?: (rating: number) => void;
}

export default function RatingStars({
  questionId,
  average,
  count,
  myRating,
  canRate,
  onRated,
}: RatingStarsProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentRating = userRating ?? myRating;

  const handleRate = async (star: number) => {
    if (!canRate || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await rateQuestion(questionId, star);
      if (res.ok) {
        setUserRating(star);
        onRated?.(star);
