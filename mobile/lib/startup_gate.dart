import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/api/api_client.dart';
import 'package:mobile/main.dart' show QuickQuizApp; // Re‑use existing app widget

/// A widget that determines the initial route based on the stored auth token.
///
/// It reads the token (both the current `jwt_token` and the legacy
/// `auth_token` key) safely, falling back to `/auth` if no valid token is
/// available or if the storage read throws. Once the route is resolved it
/// builds the regular [QuickQuizApp] with the appropriate `initialRoute`.
class StartupGate extends ConsumerStatefulWidget {
  const StartupGate({super.key});

  @override
  ConsumerState<StartupGate> createState() => _StartupGateState();
}

class _StartupGateState extends ConsumerState<StartupGate> {
  late Future<String> _initialRouteFuture;

  @override
  void initState() {
    super.initState();
    _initialRouteFuture = _determineInitialRoute();
  }

  Future<String> _determineInitialRoute() async {
    final apiClient = ApiClient();
    String? token;
    try {
      token = await apiClient.getToken();
    } catch (_) {
      // On any error treat as no token.
      token = null;
    }
    return (token != null && token.isNotEmpty) ? '/quiz' : '/auth';
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<String>(
      future: _initialRouteFuture,
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          // Simple loading indicator while we check storage.
          return const MaterialApp(
            home: Scaffold(
              body: Center(child: CircularProgressIndicator()),
            ),
          );
        }
        // Build the actual app with the resolved initial route.
        return ProviderScope(
          child: QuickQuizApp(initialRoute: snapshot.data!),
        );
      },
    );
  }
}
