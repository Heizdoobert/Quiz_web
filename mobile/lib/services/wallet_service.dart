import 'package:reown_walletkit/reown_walletkit.dart';
import 'package:url_launcher/url_launcher.dart';

class WalletService {
  late ReownSignClient _reownSignClient;
  SessionData? sessionData;

  Future<void> init(String projectId) async {
    _reownSignClient = await ReownSignClient.createInstance(
      projectId: projectId,
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

  Future<String?> connect() async {
    final ConnectResponse response = await _reownSignClient.connect(
      optionalNamespaces: {
        'eip155': const RequiredNamespace(
          chains: ['eip155:1'], // Ethereum Mainnet
          methods: ['personal_sign', 'eth_signTypedData_v4'],
          events: ['chainChanged', 'accountsChanged'],
        ),
      },
    );
    
    // Trigger the deep link to the wallet
    if (response.uri != null) {
      final uri = response.uri!;
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    }

    sessionData = await response.session.future;
    return sessionData?.namespaces['eip155']?.accounts.first.split(':').last;
  }

  Future<String?> personalSign(String message, String address) async {
    if (sessionData == null) throw Exception("No active session");
    
    final topic = sessionData!.topic;
    const chainId = 'eip155:1';
    
    // Send the request
    final futureResponse = _reownSignClient.request(
      topic: topic,
      chainId: chainId,
      request: SessionRequestParams(
        method: 'personal_sign',
        params: [message, address],
      ),
    );

    // Launch wallet app to sign
    if (sessionData!.peer.metadata.redirect?.native != null) {
      final nativeUrl = sessionData!.peer.metadata.redirect!.native!;
      final uri = Uri.parse(nativeUrl);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    }

    final dynamic response = await futureResponse;
    return response as String?;
  }
}
