import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../auth/auth_provider.dart';

/// What the web's Live Scoreboard and Global Top panels show, from GET /quiz/board.
/// Stats and history are the server's: answers only count once they have synced.
class Board {
  const Board({
    this.score = 0,
    this.streak = 0,
    this.bestStreak = 0,
    this.accuracy = 0,
    this.totalAnswered = 0,
    this.history = const [],
    this.leaderboard = const [],
  });

  factory Board.fromJson(Map<String, dynamic> json) {
    final stats = json['stats'] as Map<String, dynamic>;
    return Board(
      score: stats['score'] as int,
      streak: stats['streak'] as int,
      bestStreak: stats['bestStreak'] as int,
      accuracy: stats['accuracy'] as int,
      totalAnswered: stats['totalAnswered'] as int,
      history: List<Map<String, dynamic>>.from(json['history'] as List),
      leaderboard: List<Map<String, dynamic>>.from(json['leaderboard'] as List),
    );
  }

  final int score;
  final int streak;
  final int bestStreak;
  final int accuracy;
  final int totalAnswered;
  final List<Map<String, dynamic>> history;
  final List<Map<String, dynamic>> leaderboard;
}

final boardProvider = FutureProvider.autoDispose<Board>((ref) async {
  return Board.fromJson(await ref.watch(apiClientProvider).get('/quiz/board'));
});
