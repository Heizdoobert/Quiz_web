import 'dart:convert';
import 'package:url_launcher/url_launcher.dart';
import 'package:walletconnect_flutter_v2/walletconnect_flutter_v2.dart';

// Pass with --dart-define=WALLET_CONNECT_PROJECT_ID=... (from cloud.reown.com).
const _projectId = String.fromEnvironment('WALLET_CONNECT_PROJECT_ID');

/// What the wallet signed: the EIP-4361 message and its `personal_sign` signature.
class WalletProof {
  const WalletProof({required this.address, required this.message, required this.signature});

  final String address;
  final String message;
  final String signature;
}

/// EIP-4361 (Sign-In with Ethereum) message, the same text the web app has the wallet sign.
String buildSiweMessage({required String address, required int chainId, required String nonce}) {
  final now = DateTime.now().toUtc();
  final issuedAt = DateTime.utc(now.year, now.month, now.day, now.hour, now.minute, now.second);
  final expires = issuedAt.add(const Duration(minutes: 10));
  return 'quiz.player.quiz wants you to sign in with your Ethereum account:\n'
      '$address\n'
      '\n'
      'Sign in to Quick Quiz so your answers count. This costs no gas.\n'
      '\n'
      'URI: https://quiz.player.quiz\n'
      'Version: 1\n'
      'Chain ID: $chainId\n'
      'Nonce: $nonce\n'
      'Issued At: ${issuedAt.toIso8601String()}\n'
      'Expiration Time: ${expires.toIso8601String()}';
}

class WalletService {
  Web3App? _web3App;

  Future<Web3App> _app() async {
    if (_projectId.isEmpty) {
      throw StateError('WALLET_CONNECT_PROJECT_ID is not set. Build with --dart-define=WALLET_CONNECT_PROJECT_ID=...');
    }
    return _web3App ??= await Web3App.createInstance(
      projectId: _projectId,
      metadata: const PairingMetadata(
        name: 'Quick Quiz Mobile',
        description: 'Web3 Quiz Companion App',
        url: 'https://quiz.player.quiz',
        icons: ['https://quiz.player.quiz/icon.png'],
        redirect: Redirect(
          native: 'quickquiz://',
          universal: 'https://quiz.player.quiz',
        ),
      ),
    );
  }

  /// Opens the player's wallet, connects, and has it sign the message [buildMessage] returns
  /// for the connected address and chain.
  Future<WalletProof> connectAndSign(String Function(String address, int chainId) buildMessage) async {
    final app = await _app();
    final connection = await app.connect(
      requiredNamespaces: {
        'eip155': const RequiredNamespace(
          chains: ['eip155:1'], // Ethereum Mainnet
          methods: ['personal_sign'],
          events: ['chainChanged', 'accountsChanged'],
        ),
      },
    );

    final uri = connection.uri;
    if (uri != null) await launchUrl(uri, mode: LaunchMode.externalApplication);
    final session = await connection.session.future;

    // "eip155:<chainId>:<address>"
    final account = session.namespaces['eip155']!.accounts.first.split(':');
    final chainId = int.parse(account[1]);
    final address = account[2];
    final message = buildMessage(address, chainId);

    // The wallet needs the foreground to show the signing prompt.
    final wallet = session.peer.metadata.redirect?.native;
    if (wallet != null && wallet.isNotEmpty) {
      try {
        await launchUrl(Uri.parse(wallet), mode: LaunchMode.externalApplication);
      } catch (_) {
        // The player can switch to the wallet by hand.
      }
    }

    final signature = await app.request(
      topic: session.topic,
      chainId: 'eip155:$chainId',
      request: SessionRequestParams(
        method: 'personal_sign',
        params: ['0x${utf8.encode(message).map((b) => b.toRadixString(16).padLeft(2, '0')).join()}', address],
      ),
    );
    await app.disconnectSession(
      topic: session.topic,
      reason: const WalletConnectError(code: 6000, message: 'Signed'),
    );

    return WalletProof(address: address, message: message, signature: signature as String);
  }
}
