import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/api/api_client.dart';
import 'package:mobile/main.dart' show QuickQuizApp;
import 'package:mobile/services/sync/sync_service.dart';

/// A widget that determines the initial route based on the stored auth token.
///
/// It reads the token safely, falling back to `/auth` if no valid token is
/// available or if the storage read throws. Once the route is resolved it
/// builds the regular [QuickQuizApp] with the appropriate `initialRoute`.
/// Also listens to app lifecycle events to sync queued offline answers on resume.
class StartupGate extends ConsumerStatefulWidget {
  const StartupGate({super.key});

  @override
  ConsumerState<StartupGate> createState() => _StartupGateState();
}

class _StartupGateState extends ConsumerState<StartupGate> {
  late Future<String> _initialRouteFuture;
  late final AppLifecycleListener _lifecycleListener;

  @override
  void initState() {
    super.initState();
    _initialRouteFuture = _determineInitialRoute();
    _lifecycleListener = AppLifecycleListener(
      onResume: () {
        ref.read(syncServiceProvider).syncAnswers();
      },
    );
  }

  @override
  void dispose() {
    _lifecycleListener.dispose();
    super.dispose();
  }

  Future<String> _determineInitialRoute() async {
    final apiClient = ApiClient();
    String? token;
    try {
      token = await apiClient.getToken();
    } catch (_) {
      token = null;
    }
    return (token != null && token.isNotEmpty) ? '/main' : '/auth';
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
