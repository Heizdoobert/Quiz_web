import 'package:walletconnect_flutter_v2/walletconnect_flutter_v2.dart';

class WalletService {
  late Web3App _web3App;
  SessionData? sessionData;

  Future<void> init(String projectId) async {
    _web3App = await Web3App.createInstance(
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
    final ConnectResponse response = await _web3App.connect(
      requiredNamespaces: {
        'eip155': const RequiredNamespace(
          chains: ['eip155:1'], // Ethereum Mainnet
          methods: ['personal_sign', 'eth_signTypedData_v4'],
          events: ['chainChanged', 'accountsChanged'],
        ),
      },
    );
    
    // In a real app, this is where we would trigger the deep link to the wallet
    // using url_launcher: launchUrl(Uri.parse(response.uri.toString()));

    sessionData = await response.session.future;
    return sessionData?.namespaces['eip155']?.accounts.first.split(':').last;
  }
}
