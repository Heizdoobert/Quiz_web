import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sentry_flutter/sentry_flutter.dart';
import 'features/quiz/quiz_screen.dart';
import 'theme/app_theme.dart';

// Pass with --dart-define=SENTRY_DSN=... (CI uses the MOBILE_SENTRY_DSN repository variable).
// Without it, crashes are not reported anywhere: the default for local runs.
const _sentryDsn = String.fromEnvironment('SENTRY_DSN');

Future<void> main() async {
  const app = ProviderScope(child: QuickQuizApp());
  if (_sentryDsn.isEmpty) return runApp(app);
  await SentryFlutter.init(
    (options) => options.dsn = _sentryDsn,
    appRunner: () => runApp(app),
  );
}

/// Opens straight onto the quiz, as a guest. Signing in is asked for only when the player
/// answers or connects (see requireSignIn).
class QuickQuizApp extends StatelessWidget {
  const QuickQuizApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Quick Quiz',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      home: const QuizScreen(),
    );
  }
}
