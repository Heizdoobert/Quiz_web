interface PlayerTier {
  title: string;
  color: string;
}

export function getPlayerTier(totalAnswered: number, score: number): PlayerTier {
  if (totalAnswered >= 50 && score >= 40) return { title: 'Grandmaster', color: '#00FFCC' };
  if (totalAnswered >= 25) return { title: 'Voyager', color: '#6C5CE7' };
  if (totalAnswered >= 10) return { title: 'Cadet', color: '#FFD166' };
  return { title: 'Novice Explorer', color: '#94A3B8' };
}
