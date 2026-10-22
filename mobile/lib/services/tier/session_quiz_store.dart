import 'package:flutter_riverpod/flutter_riverpod.dart';

/// In-memory storage for unauthenticated guest quiz creation.
/// As per requirements:
/// - Stored in RAM only for the current active session.
/// - If the user turns off/closes the app, this data is NOT saved in local SQLite
///   and is NOT synced with the server.
/// - Strictly capped at 20 quizzes.
class SessionQuizStore {
  static const int guestLimit = 20;

  final List<Map<String, dynamic>> _sessionQuestions = [];

  List<Map<String, dynamic>> get questions => List.unmodifiable(_sessionQuestions);

  int get count => _sessionQuestions.length;

  bool get isFull => _sessionQuestions.length >= guestLimit;

  /// Adds a question to the session store.
  /// Returns `true` if added, or `false` if the 20-quiz limit is reached.
  bool addQuestion(Map<String, dynamic> question) {
    if (isFull) {
      return false;
    }
    _sessionQuestions.add(Map<String, dynamic>.from(question));
    return true;
  }

  void clear() {
    _sessionQuestions.clear();
  }
}

final sessionQuizStoreProvider = Provider<SessionQuizStore>((ref) {
  return SessionQuizStore();
});
