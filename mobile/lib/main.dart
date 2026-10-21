import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sentry_flutter/sentry_flutter.dart';
import 'features/auth/auth_screen.dart';
import 'features/main/main_screen.dart';
import 'features/settings/settings_screen.dart';
import 'features/user/user_screen.dart';
import 'features/quiz/quiz_screen.dart';
import 'features/leaderboard/leaderboard_screen.dart';
import 'features/score/score_screen.dart';
import 'theme/app_theme.dart';
import 'package:mobile/api/api_client.dart';
// Pass with --dart-define=SENTRY_DSN=... (CI uses the MOBILE_SENTRY_DSN repository variable).
// Without it, crashes are not reported anywhere: the default for local runs.
const _sentryDsn = String.fromEnvironment('SENTRY_DSN');

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Guard token read to avoid crashes if secure storage is unavailable.
  String? token;
  try {
    token = await apiClient.getToken();
  } catch (e) {
    // If reading fails, treat as no token.
    token = null;
  }
  final initialRoute = (token != null && token.isNotEmpty) ? '/quiz' : '/auth';
  final app = ProviderScope(
    child: const StartupGate(),
  );
  if (_sentryDsn.isEmpty) {
    runApp(app);
    return;
  }
  await SentryFlutter.init(
    (options) => options.dsn = _sentryDsn,
    appRunner: () => runApp(app),
  );
}

class QuickQuizApp extends StatelessWidget {
  const QuickQuizApp({
    super.key,
    this.initialRoute = '/auth',
  });

  final String initialRoute;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Quick Quiz',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      initialRoute: initialRoute,
      routes: {
        '/auth': (_) => const AuthScreen(),
        '/main': (_) => const MainScreen(),
        '/settings': (_) => const SettingsScreen(),
        '/user': (_) => const UserScreen(),
        '/quiz': (_) => const QuizScreen(),
        '/leaderboard': (_) => const LeaderboardScreen(),
        '/score': (_) => const ScoreScreen(),
      },
    );
  }
}
