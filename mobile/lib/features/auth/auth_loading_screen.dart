import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../theme/app_theme.dart';
import '../../widgets/glass_card.dart';
import 'auth_bloc.dart';
import '../../repositories/auth_repository.dart';
import '../../services/secure_storage_service.dart';
import '../../api/api_client.dart';
import '../../features/quiz/quiz_screen.dart';
import 'auth_screen.dart';

/// A loading screen that checks for an existing auth token using [AuthBloc]
/// and automatically navigates to the appropriate next screen.
class AuthLoadingScreen extends ConsumerStatefulWidget {
  final AuthRepository? repository;
  AuthLoadingScreen({super.key, this.repository});


  @override
  ConsumerState<AuthLoadingScreen> createState() => _AuthLoadingScreenState();
}

class _AuthLoadingScreenState extends ConsumerState<AuthLoadingScreen> {
  late final AuthBloc _authBloc;


  @override
  void initState() {
    super.initState();
    _authBloc = AuthBloc(widget.repository ?? AuthRepository(ApiClient(), SecureStorageService()));
    // Immediately start authentication check.
    _authBloc.add(AppStarted());
  }

  @override
  void dispose() {
    _authBloc.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider.value(
      value: _authBloc,
      child: BlocBuilder<AuthBloc, AuthState>(
        builder: (context, state) {
          if (state is AuthAuthenticated) {
            // Directly show the QuizScreen when authenticated.
            return const QuizScreen();
          } else if (state is AuthUnauthenticated) {
            // Show the AuthScreen when not authenticated.
            return const AuthScreen();
          }
          // While checking authentication status, show nothing.
          return const SizedBox.shrink();
        },
      ),
    );
  }
}
