import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../api/api_client.dart';
import '../../services/wallet_service.dart';

final apiClientProvider = Provider((ref) => ApiClient());
final walletServiceProvider = Provider((ref) => WalletService());

final authProvider = NotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);

class AuthState {
  final bool isAuthenticated;
  final bool isLoading;
  final String? walletAddress;

  AuthState({this.isAuthenticated = false, this.isLoading = false, this.walletAddress});
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

  Future<void> login() async {
    try {
      state = AuthState(isLoading: true);
      final api = ref.read(apiClientProvider);
      final wallet = ref.read(walletServiceProvider);
      
      final nonceRes = await api.post('/auth/nonce', {});
      final String nonce = nonceRes['nonce'];
      final String nonceToken = nonceRes['nonceToken'];

      await wallet.init('7e33dc97e5831df0d9f0ab0c5a019d36'); // Dummy Project ID or environment variable
      final address = await wallet.connect();
      
      if (address == null) throw Exception("Failed to connect wallet");

      final String domain = 'quiz.player.quiz';
      final String uri = 'https://quiz.player.quiz';
      final String version = '1';
      final String chainId = '1';
      final String issuedAt = DateTime.now().toUtc().toIso8601String();
      
      final String siweMessage = '''$domain wants you to sign in with your Ethereum account:
$address

Sign in to Quick Quiz Mobile

URI: $uri
Version: $version
Chain ID: $chainId
Nonce: $nonce
Issued At: $issuedAt''';

      final signature = await wallet.personalSign(siweMessage, address);
      if (signature == null) throw Exception("Failed to sign message");

      final verifyRes = await api.post('/auth/verify', {
        'message': siweMessage,
        'signature': signature,
        'nonceToken': nonceToken,
      });

      final token = verifyRes['token'];
      await api.saveToken(token);
      
      state = AuthState(isAuthenticated: true, isLoading: false, walletAddress: address);
    } catch (e) {
      print("Login error: $e");
      state = AuthState(isAuthenticated: false, isLoading: false);
    }
  }

  Future<void> logout() async {
    await ref.read(apiClientProvider).clearToken();
    state = AuthState(isAuthenticated: false, isLoading: false);
  }
}
