import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sentry_flutter/sentry_flutter.dart';
import 'features/auth/auth_screen.dart';
import 'features/main/main_screen.dart';
import 'features/settings/settings_screen.dart';
import 'features/user/user_screen.dart';
import 'features/quiz/quiz_screen.dart';
import 'features/quiz/create_quiz_screen.dart';
import 'features/community/community_feed_screen.dart';
import 'features/leaderboard/leaderboard_screen.dart';
import 'features/score/score_screen.dart';
import 'theme/app_theme.dart';
import 'startup_gate.dart';

// Pass with --dart-define=SENTRY_DSN=... (CI uses the MOBILE_SENTRY_DSN repository variable).
// Without it, crashes are not reported anywhere: the default for local runs.
const _sentryDsn = String.fromEnvironment('SENTRY_DSN');

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final app = const ProviderScope(
    child: StartupGate(),
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
    this.initialRoute = '/main',
  });

  final String initialRoute;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Quick Quiz',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      initialRoute: initialRoute,
      onGenerateRoute: (settings) {
        final name = settings.name ?? '';
        final uri = Uri.tryParse(name);
        String path = uri?.path ?? name;
        if (uri != null && uri.scheme == 'quickquiz') {
          final host = uri.host;
          if (host == 'community') {
            return MaterialPageRoute(builder: (_) => const MainScreen(initialIndex: 1), settings: settings);
          } else if (host == 'leaderboard') {
            return MaterialPageRoute(builder: (_) => const MainScreen(initialIndex: 2), settings: settings);
          } else if (host == 'profile') {
            return MaterialPageRoute(builder: (_) => const MainScreen(initialIndex: 3), settings: settings);
          } else if (host == 'settings') {
            return MaterialPageRoute(builder: (_) => const MainScreen(initialIndex: 4), settings: settings);
          } else if (host == 'quiz') {
            return MaterialPageRoute(builder: (_) => const MainScreen(initialIndex: 0), settings: settings);
          }
          path = uri.host.isNotEmpty ? '/${uri.host}${uri.path}' : uri.path;
        }
        if (path.isEmpty || path == '/') {
          path = initialRoute;
        }

        switch (path) {
          case '/auth':
            return MaterialPageRoute(builder: (_) => const AuthScreen(), settings: settings);
          case '/main':
            final index = settings.arguments is int ? settings.arguments as int : 0;
            return MaterialPageRoute(builder: (_) => MainScreen(initialIndex: index), settings: settings);
          case '/settings':
            return MaterialPageRoute(builder: (_) => const SettingsScreen(), settings: settings);
          case '/user':
            return MaterialPageRoute(builder: (_) => const UserScreen(), settings: settings);
          case '/quiz':
            return MaterialPageRoute(builder: (_) => const QuizScreen(), settings: settings);
          case '/leaderboard':
            return MaterialPageRoute(builder: (_) => const LeaderboardScreen(), settings: settings);
          case '/score':
            return MaterialPageRoute(builder: (_) => const ScoreScreen(), settings: settings);
          case '/create-quiz':
            return MaterialPageRoute(builder: (_) => const CreateQuizScreen(), settings: settings);
          case '/community':
            return MaterialPageRoute(builder: (_) => const CommunityFeedScreen(), settings: settings);
          default:
            return MaterialPageRoute(builder: (_) => const AuthScreen(), settings: settings);
        }
      },
      routes: {
        '/auth': (_) => const AuthScreen(),
        '/main': (_) => const MainScreen(),
        '/settings': (_) => const SettingsScreen(),
        '/user': (_) => const UserScreen(),
        '/quiz': (_) => const QuizScreen(),
        '/leaderboard': (_) => const LeaderboardScreen(),
        '/score': (_) => const ScoreScreen(),
        '/create-quiz': (_) => const CreateQuizScreen(),
        '/community': (_) => const CommunityFeedScreen(),
      },
    );
  }
}
