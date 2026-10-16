import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../repositories/auth_repository.dart';

// ---- Auth Events ----
abstract class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object?> get props => [];
}

class AppStarted extends AuthEvent {}

class LoggedIn extends AuthEvent {
  final String token;
  const LoggedIn(this.token);

  @override
  List<Object?> get props => [token];
}

class LoggedOut extends AuthEvent {}

class TokenRefreshRequested extends AuthEvent {}

// ---- Auth States ----
abstract class AuthState extends Equatable {
  const AuthState();

  @override
  List<Object?> get props => [];
}

class AuthInitial extends AuthState {}

class AuthLoading extends AuthState {}

class AuthAuthenticated extends AuthState {
  final String token;
  const AuthAuthenticated(this.token);

  @override
  List<Object?> get props => [token];
}

class AuthUnauthenticated extends AuthState {}

class AuthFailure extends AuthState {
  final String message;
  const AuthFailure(this.message);

  @override
  List<Object?> get props => [message];
}

// ---- Auth Bloc ----
class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final AuthRepository _authRepository;

  AuthBloc(this._authRepository) : super(AuthInitial()) {
    on<AppStarted>(_onAppStarted);
    on<LoggedIn>(_onLoggedIn);
    on<LoggedOut>(_onLoggedOut);
    on<TokenRefreshRequested>(_onTokenRefreshRequested);
  }

  Future<void> _onAppStarted(AppStarted event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    bool isValid = false;
    try {
      isValid = await _authRepository.isTokenValid();
    } catch (_) {
      isValid = false;
    }
    if (isValid) {
      final token = await _authRepository.readToken(); // use public method
      emit(AuthAuthenticated(token!));
    } else {
      emit(AuthUnauthenticated());
    }
  }

  Future<void> _onLoggedIn(LoggedIn event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    await _authRepository.saveToken(event.token);
    emit(AuthAuthenticated(event.token));
  }

  Future<void> _onLoggedOut(LoggedOut event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    await _authRepository.clearToken();
    emit(AuthUnauthenticated());
  }

  Future<void> _onTokenRefreshRequested(TokenRefreshRequested event, Emitter<AuthState> emit) async {
    // For now we just treat it as a re‑check of validity.
    emit(AuthLoading());
    final isValid = await _authRepository.isTokenValid();
    if (isValid) {
      final token = await _authRepository.readToken(); // use public method
      emit(AuthAuthenticated(token!));
    } else {
      emit(AuthUnauthenticated());
    }
  }
}
