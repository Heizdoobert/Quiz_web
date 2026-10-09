import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../../api/api_client.dart';

// Pass with --dart-define=GOOGLE_SERVER_CLIENT_ID=... (the Web OAuth client id that
// Supabase's Google provider is set up with).
const _googleServerClientId = String.fromEnvironment('GOOGLE_SERVER_CLIENT_ID');

final apiClientProvider = Provider((ref) => ApiClient());

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.watch(apiClientProvider));
});

class AuthState {
  const AuthState({
    this.isAuthenticated = false,
    this.isLoading = false,
    this.error,
  });

  /// Signed in with Google or a username. Guests can browse; answers only count once signed in.
  final bool isAuthenticated;
  final bool isLoading;
  final String? error;
}

class AuthNotifier extends StateNotifier<AuthState> {
  final ApiClient _apiClient;
  bool _googleReady = false;

  AuthNotifier(this._apiClient) : super(const AuthState(isLoading: true)) {
    _checkExistingSession();
  }

  Future<void> _checkExistingSession() async {
    final token = await _apiClient.getToken();
    state = AuthState(isAuthenticated: token != null);
  }

  Future<void> _startSession(Map<String, dynamic> res) async {
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
    state = const AuthState();
  }
}
