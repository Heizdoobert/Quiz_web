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
      } else {
        if (res.code === 'NOT_ALLOWED') {
          setError('Authors cannot rate their own questions');
        } else if (res.code === 'NOT_ANSWERED') {
          setError('You must answer this question first');
        } else {
          setError('Failed to save rating');
        }
      }
    } catch (e) {
      console.error('Rating error:', e);
      setError('Failed to save rating');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => {
            const isFilled = star <= (hoverRating ?? (currentRating ?? (canRate ? 0 : Math.round(average))));

            if (!canRate) {
              return (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= Math.round(average)
                      ? 'text-[#FFD166] fill-[#FFD166]'
                      : 'text-slate-600'
                  }`}
                  aria-hidden="true"
                />
              );
            }

            return (
              <button
                key={star}
                type="button"
                aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                disabled={submitting}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(null)}
                onClick={() => handleRate(star)}
                className="p-0.5 rounded hover:scale-110 transition-transform cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FFD166]"
              >
                <Star
                  className={`w-4 h-4 transition-colors ${
                    isFilled
                      ? 'text-[#FFD166] fill-[#FFD166]'
                      : 'text-slate-500 hover:text-[#FFD166]'
                  }`}
                />
              </button>
            );
          })}
        </div>

        <span className="text-sm font-bold font-heading text-slate-100">
          {average > 0 ? average.toFixed(1) : '0.0'}
        </span>
        <span className="text-xs text-slate-400">({count})</span>
      </div>

      {error && <p className="text-xs text-[#FF4757] font-medium">{error}</p>}
    </div>
  );
}
