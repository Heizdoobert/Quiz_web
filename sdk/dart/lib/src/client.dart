import 'package:http/http.dart' as h;
import 'http.dart';
import 'models.dart';
import 'transactions.dart';

/// Entry point, same shape as the TypeScript `QuickQuizClient`. `baseUrl` is the site's `/api`
/// root (for example `https://quickquiz.app/api`); every path below starts with `/v1`.
class QuickQuizClient {
  QuickQuizClient({
    required String baseUrl,
    String? token,
    h.Client? client,
    Duration? timeout,
    int retries = 0,
  }) : http = HttpClient(
          baseUrl: baseUrl,
          token: token,
          client: client,
          timeout: timeout,
          retries: retries,
        ) {
    auth = AuthResource(this);
    questions = QuestionsResource(this);
    quiz = QuizResource(this);
    leaderboard = LeaderboardResource(this);
    community = CommunityResource(this);
    groups = GroupsResource(this);
    discovery = DiscoveryResource(this);
    profile = ProfileResource(this);
    transactions = TransactionManager();
  }

  final HttpClient http;
  late final AuthResource auth;
  late final QuestionsResource questions;
  late final QuizResource quiz;
  late final LeaderboardResource leaderboard;
  late final CommunityResource community;
  late final GroupsResource groups;
  late final DiscoveryResource discovery;
  late final ProfileResource profile;
  late final TransactionManager transactions;

  String? get token => http.token;
  set token(String? value) => http.token = value;

  Future<dynamic> _get(String path, [Map<String, Object?>? query]) =>
      http.request(path, query: query);
  Future<dynamic> _post(String path, [Object? body]) =>
      http.request(path, method: 'POST', body: body);
}

String _seg(String s) => Uri.encodeComponent(s);
Json _json(dynamic v) => v as Json;
List<T> _list<T>(dynamic v, T Function(Json) f) =>
    (v as List).map((e) => f(e as Json)).toList();
bool _ok(dynamic v) => (v as Json)['ok'] as bool;

class AuthResource {
  AuthResource(this._c);
  final QuickQuizClient _c;

  Future<AuthResult> _signedIn(Future<dynamic> call) async {
    final res = AuthResult.fromJson(_json(await call));
    _c.token = res.token;
    return res;
  }

  Future<AuthResult> signUp(String username, String password) => _signedIn(_c
      ._post('/v1/auth/signup', {'username': username, 'password': password}));

  Future<AuthResult> signIn(String username, String password) => _signedIn(_c
      ._post('/v1/auth/signin', {'username': username, 'password': password}));

  Future<AuthResult> signInWithGoogle(String idToken) =>
      _signedIn(_c._post('/v1/auth/signin/google', {'idToken': idToken}));

  Future<bool> requestEmailCode(String email) async =>
      (_json(await _c._post('/v1/auth/email/request', {'email': email}))['sent']
          as bool);

  Future<VerifyEmailResult> verifyEmailCode(String email, String code) async {
    final res = VerifyEmailResult.fromJson(
      _json(await _c
          ._post('/v1/auth/email/verify', {'email': email, 'code': code})),
    );
    if (res.token != null) _c.token = res.token;
    return res;
  }

  Future<AuthSession> session() async =>
      AuthSession.fromJson(_json(await _c._get('/v1/auth/session')));

  /// Clears the stored token even when the request fails.
  Future<bool> signOut() async {
    try {
      return _ok(await _c._post('/v1/auth/signout'));
    } finally {
      _c.token = null;
    }
  }
}

class QuestionsResource {
  QuestionsResource(this._c);
  final QuickQuizClient _c;

  Future<ClientQuestion?> random(
      {String? category, List<String>? exclude}) async {
    final v = await _c._get(
        '/v1/questions/random', {'category': category, 'exclude': exclude});
    return v == null ? null : ClientQuestion.fromJson(_json(v));
  }

  Future<ClientQuestion> get(String id) async => ClientQuestion.fromJson(
      _json(await _c._get('/v1/questions/${_seg(id)}')));

  Future<int> count() async =>
      (_json(await _c._get('/v1/questions/count'))['count'] as num).toInt();

  Future<void> create(CreateQuestionInput input) =>
      _c._post('/v1/questions', input.toJson());

  Future<GeneratedQuestion> generate(String topic) async =>
      GeneratedQuestion.fromJson(
          _json(await _c._post('/v1/questions/generate', {'topic': topic})));

  /// True when the dispute quarantined the question.
  Future<bool> dispute(String id, String reason) async => (_json(
        await _c._post('/v1/questions/${_seg(id)}/dispute', {'reason': reason}),
      )['quarantined'] as bool);

  Future<List<int>> fiftyFifty(String id) async =>
      List<int>.from(await _c._get('/v1/questions/${_seg(id)}/5050') as List);
}

class QuizResource {
  QuizResource(this._c);
  final QuickQuizClient _c;

  Future<AnswerSubmissionResult> submitAnswer(
          String questionId, int answerIndex) async =>
      AnswerSubmissionResult.fromJson(_json(
        await _c._post('/v1/quiz/answer',
            {'questionId': questionId, 'answerIndex': answerIndex}),
      ));

  Future<List<HistoryItem>> history() async =>
      _list(await _c._get('/v1/quiz/history'), HistoryItem.fromJson);

  Future<UserStats> stats() async =>
      UserStats.fromJson(_json(await _c._get('/v1/quiz/stats')));
}

class LeaderboardResource {
  LeaderboardResource(this._c);
  final QuickQuizClient _c;

  Future<List<LeaderboardEntry>> global({int? limit, int? offset}) async =>
      _list(
        await _c._get('/v1/leaderboard', {'limit': limit, 'offset': offset}),
        LeaderboardEntry.fromJson,
      );

  Future<List<LeaderboardEntry>> group(String groupId,
          {int? limit, int? offset}) async =>
      _list(
        await _c._get('/v1/leaderboard/group/${_seg(groupId)}',
            {'limit': limit, 'offset': offset}),
        LeaderboardEntry.fromJson,
      );
}

class CommunityResource {
  CommunityResource(this._c);
  final QuickQuizClient _c;

  Future<bool> rate(String questionId, int rating) async => _ok(await _c
      ._post('/v1/questions/${_seg(questionId)}/rate', {'rating': rating}));

  /// `kind` is `comment` (default) or `suggestion`.
  Future<bool> comment(String questionId, String body, {String? kind}) async =>
      _ok(
        await _c._post('/v1/questions/${_seg(questionId)}/comment', {
          'body': body,
          if (kind != null) 'kind': kind,
        }),
      );

  Future<bool> deleteComment(String commentId) async => _ok(
        await _c.http
            .request('/v1/comments/${_seg(commentId)}', method: 'DELETE'),
      );

  Future<bool> resolveSuggestion(String suggestionId) async =>
      _ok(await _c._post('/v1/suggestions/${_seg(suggestionId)}/resolve'));

  Future<DiscussionView> discussion(String questionId, {int? page}) async =>
      DiscussionView.fromJson(
        _json(await _c._get(
            '/v1/questions/${_seg(questionId)}/discussion', {'page': page})),
      );

  Future<List<SuggestionView>> suggestions() async =>
      _list(await _c._get('/v1/suggestions'), SuggestionView.fromJson);
}

class GroupsResource {
  GroupsResource(this._c);
  final QuickQuizClient _c;

  Future<Group> create(String name, {String? description}) async =>
      Group.fromJson(_json(
        await _c._post('/v1/groups', {
          'name': name,
          if (description != null) 'description': description,
        }),
      ));

  Future<List<Group>> list() async =>
      _list(await _c._get('/v1/groups'), Group.fromJson);

  Future<bool> join(String groupId) async =>
      _ok(await _c._post('/v1/groups/${_seg(groupId)}/join'));

  Future<bool> leave(String groupId) async =>
      _ok(await _c._post('/v1/groups/${_seg(groupId)}/leave'));
}

class DiscoveryResource {
  DiscoveryResource(this._c);
  final QuickQuizClient _c;

  Future<SearchResultPage> search(String query,
          {int? limit, int? offset, int? page}) async =>
      SearchResultPage.fromJson(_json(
        await _c._get('/v1/search',
            {'q': query, 'limit': limit, 'offset': offset, 'page': page}),
      ));

  Future<List<TopicInfo>> topics() async =>
      _list(await _c._get('/v1/topics'), TopicInfo.fromJson);

  Future<SearchResultPage> topicQuestions(String topic,
          {int? limit, int? offset, int? page}) async =>
      SearchResultPage.fromJson(_json(
        await _c._get('/v1/topics/${_seg(topic)}/questions', {
          'limit': limit,
          'offset': offset,
          'page': page,
        }),
      ));
}

class ProfileResource {
  ProfileResource(this._c);
  final QuickQuizClient _c;

  Future<UserQuizzes> quizzes(
          {int? limit, int? offset, String? category, String? status}) async =>
      UserQuizzes.fromJson(_json(await _c._get('/v1/profile/quizzes', {
        'limit': limit,
        'offset': offset,
        'category': category,
        'status': status,
      })));

  /// Raw backup document (`accountId`, `exportedAt`, `version`, `quizzes`, `stats`).
  Future<Json> export() async => _json(await _c._get('/v1/profile/export'));

  Future<List<QuestionAnalytics>> analytics() async =>
      _list(await _c._get('/v1/profile/analytics'), QuestionAnalytics.fromJson);
}
