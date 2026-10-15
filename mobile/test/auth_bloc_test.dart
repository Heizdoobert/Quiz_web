// Test for AuthBloc state transitions
import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/auth/auth_bloc.dart';
import 'package:mobile/repositories/auth_repository.dart';
import 'package:mobile/services/secure_storage_service.dart';
import 'package:mobile/api/api_client.dart';

class FakeAuthRepository extends AuthRepository {
  final bool tokenValid;
  final String? storedToken;

  FakeAuthRepository({required this.tokenValid, this.storedToken})
      : super(ApiClient(), SecureStorageService());

  @override
  Future<bool> isTokenValid() async => tokenValid;

  @override
  Future<void> saveToken(String token) async {}

  @override
  Future<void> clearToken() async {}

  @override
  Future<String?> readToken() async => storedToken;
}

void main() {
  group('AuthBloc', () {
    blocTest<AuthBloc, AuthState>(
      'emits [AuthLoading, AuthAuthenticated] when token is valid',
      build: () => AuthBloc(FakeAuthRepository(tokenValid: true, storedToken: 'abc')),
      act: (bloc) => bloc.add(AppStarted()),
      expect: () => [isA<AuthLoading>(), isA<AuthAuthenticated>()],
    );

    blocTest<AuthBloc, AuthState>(
      'emits [AuthLoading, AuthUnauthenticated] when token is invalid',
      build: () => AuthBloc(FakeAuthRepository(tokenValid: false)),
      act: (bloc) => bloc.add(AppStarted()),
      expect: () => [isA<AuthLoading>(), isA<AuthUnauthenticated>()],
    );
  });
}
