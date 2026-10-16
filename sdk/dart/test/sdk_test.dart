import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:quickquiz_sdk/quickquiz_sdk.dart';
import 'package:test/test.dart';

QuickQuizClient clientFor(
  Future<http.Response> Function(http.Request) handler, {
  String? token,
  int retries = 0,
}) =>
    QuickQuizClient(
      baseUrl: 'https://x.test/api/',
      token: token,
      client: MockClient(handler),
      retries: retries,
    );

http.Response ok(Object? data) =>
    http.Response(jsonEncode({'success': true, 'data': data}), 200);

void main() {
  test('signIn stores the token and sends it on later calls', () async {
    final seen = <String?>[];
    final c = clientFor((r) async {
      seen.add(r.headers['Authorization']);
      if (r.url.path == '/api/v1/auth/signin') {
        expect(jsonDecode(r.body), {'username': 'a', 'password': 'b'});
        return ok({'token': 't1', 'accountId': 'acc'});
      }
      return ok({'id': 'acc', 'username': 'a'});
    });
    await c.auth.signIn('a', 'b');
    expect(c.token, 't1');
    expect((await c.auth.session()).username, 'a');
    expect(seen, [null, 'Bearer t1']);
  });

  test('signOut clears the token even when the call fails', () async {
    final c = clientFor((r) async => http.Response('{"error":"no"}', 500),
        token: 't');
    await expectLater(c.auth.signOut(), throwsA(isA<QuickQuizError>()));
    expect(c.token, isNull);
  });

  test('query skips nulls and joins lists; path segments are encoded',
      () async {
    final urls = <Uri>[];
    final c = clientFor((r) async {
      urls.add(r.url);
      return ok(r.url.path.endsWith('random')
          ? null
          : {'results': [], 'hasMore': false});
    });
    expect(
        await c.questions.random(category: 'a b', exclude: ['1', '2']), isNull);
    await c.discovery.topicQuestions('x/y', limit: 5);
    expect(urls[0].queryParameters, {'category': 'a b', 'exclude': '1,2'});
    expect(urls[1].path, '/api/v1/topics/x%2Fy/questions');
    expect(urls[1].queryParameters, {'limit': '5'});
  });

  test('error envelope and plain error bodies become QuickQuizError', () async {
    var plain = false;
    final c = clientFor((r) async => plain
        ? http.Response('{"error":"nope"}', 403)
        : http.Response(
            jsonEncode({
              'success': false,
              'error': {'code': 'RATE_LIMITED', 'message': 'slow'},
            }),
            429,
          ));
    await expectLater(
      c.quiz.stats(),
      throwsA(isA<QuickQuizError>()
          .having((e) => e.code, 'code', 'RATE_LIMITED')
          .having((e) => e.status, 'status', 429)),
    );
    plain = true;
    await expectLater(
      c.quiz.stats(),
      throwsA(isA<QuickQuizError>()
          .having((e) => e.message, 'message', 'nope')
          .having((e) => e.code, 'code', 'HTTP_ERROR')),
    );
  });

  test('retries idempotent GET on 503 but never a POST', () async {
    var gets = 0, posts = 0;
    final c = clientFor((r) async {
      if (r.method == 'GET')
        return ++gets < 3 ? http.Response('', 503) : ok({'count': 7});
      posts++;
      return http.Response('', 503);
    }, retries: 3);
    expect(await c.questions.count(), 7);
    expect(gets, 3);
    await expectLater(
        c.quiz.submitAnswer('q', 1), throwsA(isA<QuickQuizError>()));
    expect(posts, 1);
  });

  test('network failure and bad JSON map to error codes', () async {
    final down = clientFor((r) async => throw http.ClientException('offline'));
    await expectLater(
        down.groups.list(),
        throwsA(isA<QuickQuizError>()
            .having((e) => e.code, 'code', 'NETWORK_ERROR')));
    final bad = clientFor((r) async => http.Response('<html>', 200));
    await expectLater(
        bad.groups.list(),
        throwsA(isA<QuickQuizError>()
            .having((e) => e.code, 'code', 'INVALID_JSON')));
  });

  test('resources decode their models', () async {
    final c = clientFor((r) async {
      switch (r.url.path) {
        case '/api/v1/quiz/answer':
          return ok({
            'isCorrect': true,
            'correctIndex': 2,
            'explanation': null,
            'recorded': false,
            'notSavedReason': 'signed-out'
          });
        case '/api/v1/leaderboard':
          return ok([
            {
              'user_id': 'u',
              'display_name': null,
              'score': 10,
              'accuracy': 0.5,
              'rank': 1
            },
          ]);
        case '/api/v1/questions/q1/discussion':
          return ok({
            'rating': {'average': null, 'count': 0},
            'myRating': null,
            'comments': [
              {
                'id': 'c',
                'body': 'b',
                'authorName': 'n',
                'createdAt': 'd',
                'mine': true
              },
            ],
            'hasMore': false,
          });
        default:
          return ok({'ok': true});
      }
    });
    final a = await c.quiz.submitAnswer('q1', 2);
    expect([a.isCorrect, a.recorded, a.notSavedReason],
        [true, false, 'signed-out']);
    expect((await c.leaderboard.global()).single.rank, 1);
    expect((await c.community.discussion('q1')).comments.single.mine, isTrue);
    expect(await c.community.deleteComment('c1'), isTrue);
  });
}
