import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../services/wallet_service.dart';

final apiClientProvider = Provider((ref) => ApiClient());
final walletServiceProvider = Provider((ref) => WalletService());

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.watch(apiClientProvider), ref.watch(walletServiceProvider));
});

class AuthState {
  final bool isAuthenticated;
  final bool isLoading;
  final String? walletAddress;

  AuthState({this.isAuthenticated = false, this.isLoading = false, this.walletAddress});
}

class AuthNotifier extends StateNotifier<AuthState> {
  final ApiClient _apiClient;
  final WalletService _walletService;

  AuthNotifier(this._apiClient, this._walletService) : super(AuthState(isLoading: true)) {
    _checkExistingSession();
  }

  Future<void> _checkExistingSession() async {
    final token = await _apiClient.getToken();
    if (token != null) {
      state = AuthState(isAuthenticated: true, isLoading: false);
    } else {
      state = AuthState(isAuthenticated: false, isLoading: false);
    }
  }

  Future<void> login() async {
    try {
      state = AuthState(isLoading: true);
      
      // 1. Get Nonce from Server
      final nonceRes = await _apiClient.post('/auth/nonce', {});
      final String nonce = nonceRes['nonce'];
      final String nonceToken = nonceRes['nonceToken'];

      // 2. Init WalletConnect (in reality this should be passed in via env vars)
      await _walletService.init('WALLET_CONNECT_PROJECT_ID');
      
      // 3. Connect and sign (mocking the sign response for now since we can't trigger real wallet popups easily in unit tests)
      final address = await _walletService.connect();
      
      if (address == null) throw Exception("Failed to connect wallet");

      // Note: In a real flow, you'd call personal_sign via _walletService here.
      // We are stubbing the signature verification step in this class for the architectural skeleton.
      final String mockSignature = "0xMockSignature";
      final String mockMessage = "Mock SIWE Message with nonce: $nonce";

      // 4. Send to server for verification
      final verifyRes = await _apiClient.post('/auth/verify', {
        'message': mockMessage,
        'signature': mockSignature,
        'nonceToken': nonceToken,
      });

      // 5. Save Token
      final token = verifyRes['token'];
      await _apiClient.saveToken(token);
      
      state = AuthState(isAuthenticated: true, isLoading: false, walletAddress: address);
    } catch (e) {
      print("Login error: $e");
      state = AuthState(isAuthenticated: false, isLoading: false);
    }
  }

  Future<void> logout() async {
    await _apiClient.clearToken();
    state = AuthState(isAuthenticated: false, isLoading: false);
  }
}
