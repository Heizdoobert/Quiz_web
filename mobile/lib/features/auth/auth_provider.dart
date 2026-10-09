import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../../api/api_client.dart';
import '../../services/wallet_service.dart';

// Pass with --dart-define=GOOGLE_SERVER_CLIENT_ID=... (the Web OAuth client id that
// Supabase's Google provider is set up with).
const _googleServerClientId = String.fromEnvironment('GOOGLE_SERVER_CLIENT_ID');

final apiClientProvider = Provider((ref) => ApiClient());
final walletServiceProvider = Provider((ref) => WalletService());

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.watch(apiClientProvider), ref.watch(walletServiceProvider));
});

class AuthState {
  const AuthState({
    this.isAuthenticated = false,
    this.isLoading = false,
    this.walletAddress,
    this.walletBusy = false,
    this.error,
  });

  /// Signed in with Google or a username. Enough to browse; answering also needs a wallet.
  final bool isAuthenticated;
  final bool isLoading;
  final String? walletAddress;
  final bool walletBusy;
  final String? error;

  bool get hasWallet => walletAddress != null;
}

class AuthNotifier extends StateNotifier<AuthState> {
  final ApiClient _apiClient;
  final WalletService _walletService;
  bool _googleReady = false;

  AuthNotifier(this._apiClient, this._walletService) : super(const AuthState(isLoading: true)) {
    _checkExistingSession();
  }

  Future<void> _checkExistingSession() async {
    final token = await _apiClient.getToken();
    state = token == null
        ? const AuthState()
        : AuthState(isAuthenticated: true, walletAddress: _walletInToken(token));
  }

  // Tokens read `<accountId>.<wallet or ->.<expiry>.<signature>` (lib/services/mobile-auth.ts).
  // The server checks the signature; this only tells the UI whether a wallet is linked.
  String? _walletInToken(String token) {
    final parts = token.split('.');
    return parts.length == 4 && parts[1] != '-' ? parts[1] : null;
  }

  Future<void> _startSession(Map<String, dynamic> res) async {
    await _apiClient.saveToken(res['token'] as String);
    state = AuthState(isAuthenticated: true, walletAddress: res['wallet'] as String?);
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

  /// Links a wallet to the signed-in account: the wallet signs a one-time SIWE message and
  /// the server attaches the address. Returns whether the account now has a wallet.
  Future<bool> connectWallet() async {
    if (state.hasWallet) return true;
    if (state.walletBusy) return false;
    state = AuthState(isAuthenticated: true, walletBusy: true);
    try {
      final nonceRes = await _apiClient.post('/auth/nonce', {});
      final proof = await _walletService.connectAndSign(
        (address, chainId) => buildSiweMessage(address: address, chainId: chainId, nonce: nonceRes['nonce'] as String),
      );
      await _startSession(await _apiClient.post('/auth/wallet', {
        'message': proof.message,
        'signature': proof.signature,
        'nonceToken': nonceRes['nonceToken'],
      }));
      return true;
    } on ApiException catch (e) {
      state = AuthState(isAuthenticated: true, error: e.message);
    } catch (e) {
      state = AuthState(isAuthenticated: true, error: 'Could not connect the wallet: $e');
    }
    return false;
  }

  Future<void> logout() async {
    await _apiClient.clearToken();
    state = const AuthState();
  }
}
