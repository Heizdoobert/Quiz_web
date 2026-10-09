import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../../api/api_client.dart';
import '../../db/quiz_repository.dart';

// Pass with --dart-define=GOOGLE_SERVER_CLIENT_ID=... (the Web OAuth client id that
// Supabase's Google provider is set up with).
const _googleServerClientId = String.fromEnvironment('GOOGLE_SERVER_CLIENT_ID');

// The callback reads authProvider when a 401 arrives, not while building, so the two
// providers do not depend on each other at build time.
final apiClientProvider = Provider(
  (ref) => ApiClient(onUnauthorized: () => ref.read(authProvider.notifier).sessionExpired()),
);

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.watch(apiClientProvider), ref.watch(quizRepositoryProvider));
});

/// Whether the queued answers may stay when [newAccountId] signs in. A queue left by another
/// account is dropped; an unknown owner (installs from before account ids were saved) keeps
/// it, since losing answers is worse.
bool keepsQueue(String? previousAccountId, String newAccountId) =>
    previousAccountId == null || previousAccountId == newAccountId;

class AuthState {
  const AuthState({
    this.isAuthenticated = false,
    this.isLoading = false,
    this.error,
    this.sessionExpired = false,
  });

  /// Signed in with Google or a username. Guests can browse; answers only count once signed in.
  final bool isAuthenticated;
  final bool isLoading;
  final String? error;

  /// The server rejected the stored token. The player is signed out, but their queued
  /// answers are kept for when they sign in again.
  final bool sessionExpired;
}

class AuthNotifier extends StateNotifier<AuthState> {
  final ApiClient _apiClient;
  final QuizRepository _quizRepository;
  bool _googleReady = false;

  AuthNotifier(this._apiClient, this._quizRepository) : super(const AuthState(isLoading: true)) {
    _checkExistingSession();
  }

  Future<void> _checkExistingSession() async {
    final token = await _apiClient.getToken();
    state = AuthState(isAuthenticated: token != null);
  }

  Future<void> _startSession(Map<String, dynamic> res) async {
    final accountId = res['accountId'] as String;
    if (!keepsQueue(await _apiClient.getAccountId(), accountId)) {
      await _quizRepository.clearAllQueuedAnswers();
    }
    await _apiClient.saveAccountId(accountId);
    await _apiClient.saveToken(res['token'] as String);
    state = const AuthState(isAuthenticated: true);
  }

  Future<void> _signIn(Future<Map<String, dynamic>> Function() request) async {
    state = const AuthState(isLoading: true);
    try {
      await _startSession(await request());
    } on ApiException catch (e) {
      state = AuthState(error: e.message);
    } catch (e) {
      state = AuthState(error: 'Sign-in failed: $e');
    }
  }

  Future<void> signInWithPassword(String username, String password, {required bool signUp}) {
    return _signIn(() => _apiClient.post('/auth/password', {
          'mode': signUp ? 'signup' : 'signin',
          'username': username,
          'password': password,
        }));
  }

  Future<void> signInWithGoogle() {
    return _signIn(() async {
      if (!_googleReady) {
        await GoogleSignIn.instance.initialize(
          serverClientId: _googleServerClientId.isEmpty ? null : _googleServerClientId,
        );
        _googleReady = true;
      }
      final account = await GoogleSignIn.instance.authenticate();
      final idToken = account.authentication.idToken;
      if (idToken == null) throw StateError('Google did not return an ID token');
      return _apiClient.post('/auth/google', {'idToken': idToken});
    });
  }

  Future<void> logout() async {
    await _apiClient.clearToken();
    await _apiClient.clearAccountId();
    state = const AuthState();
  }

  /// Signs out after the server rejected the token, keeping the answer queue and the account
  /// id. Several requests can fail at once; only the first one acts.
  Future<void> sessionExpired() async {
    if (!state.isAuthenticated) return;
    state = const AuthState(sessionExpired: true);
    await _apiClient.clearToken();
  }
}
