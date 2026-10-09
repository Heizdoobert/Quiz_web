import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../api/api_client.dart';

final apiClientProvider = Provider((ref) => ApiClient());

final authProvider = NotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);

class AuthState {
  final bool isAuthenticated;
  final bool isLoading;

  AuthState({this.isAuthenticated = false, this.isLoading = false});
}

class AuthNotifier extends Notifier<AuthState> {
  @override
  AuthState build() {
    Future.microtask(_checkExistingSession);
    return AuthState(isLoading: true);
  }

  Future<void> _checkExistingSession() async {
    final token = await ref.read(apiClientProvider).getToken();
    if (token != null) {
      state = AuthState(isAuthenticated: true, isLoading: false);
    } else {
      state = AuthState(isAuthenticated: false, isLoading: false);
    }
  }

  Future<void> login(String email, String password) async {
    try {
      state = AuthState(isLoading: true);
      final api = ref.read(apiClientProvider);
      
      final res = await api.post('/auth/login', {
        'email': email,
        'password': password,
      });

      final token = res['token'];
      if (token != null) {
        await api.saveToken(token);
        state = AuthState(isAuthenticated: true, isLoading: false);
      } else {
        throw Exception("Invalid credentials");
      }
    } catch (e) {
      print("Login error: $e");
      state = AuthState(isAuthenticated: false, isLoading: false);
      throw e;
    }
  }

  Future<void> logout() async {
    await ref.read(apiClientProvider).clearToken();
    state = AuthState(isAuthenticated: false, isLoading: false);
  }
}
