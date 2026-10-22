/// Response types, matching `sdk/src/types.ts`. Dates stay ISO strings, as on the wire.
typedef Json = Map<String, dynamic>;

List<T> _list<T>(Object? v, T Function(Json) f) =>
    (v as List? ?? const []).map((e) => f(e as Json)).toList();

class ClientQuestion {
  ClientQuestion.fromJson(Json j)
      : id = j['id'] as String,
        category = j['category'] as String,
        prompt = j['prompt'] as String,
        options = List<String>.from(j['options'] as List),
        status = j['status'] as String?,
        createdBy = j['created_by'] as String?,
        createdAt = j['created_at'] as String?;

  final String id, category, prompt;
  final List<String> options;
  final String? status, createdBy, createdAt;
}

class CreateQuestionInput {
  const CreateQuestionInput({
    required this.prompt,
    required this.options,
    required this.correctIndex,
    this.category,
    this.explanation,
  });

  final String prompt;
  final List<String> options;
  final int correctIndex;
  final String? category, explanation;

  Json toJson() => {
        'prompt': prompt,
        'options': options,
        'correctIndex': correctIndex,
        if (category != null) 'category': category,
        if (explanation != null) 'explanation': explanation,
      };
}

class GeneratedQuestion {
  GeneratedQuestion.fromJson(Json j)
      : prompt = j['prompt'] as String,
        options = List<String>.from(j['options'] as List),
        correctIndex = j['correctIndex'] as int,
        explanation = j['explanation'] as String;

  final String prompt, explanation;
  final List<String> options;
  final int correctIndex;
}

class AuthResult {
  AuthResult.fromJson(Json j)
      : token = j['token'] as String,
        accountId = j['accountId'] as String;

  final String token, accountId;
}

class VerifyEmailResult {
  VerifyEmailResult.fromJson(Json j)
      : ok = j['ok'] as bool? ?? false,
        token = j['token'] as String?,
        accountId = j['accountId'] as String?;

  final bool ok;
  final String? token, accountId;
}

class AuthSession {
  AuthSession.fromJson(Json j)
      : id = j['id'] as String,
        username = j['username'] as String;

  final String id, username;
}

class AnswerSubmissionResult {
  AnswerSubmissionResult.fromJson(Json j)
      : isCorrect = j['isCorrect'] as bool,
        correctIndex = j['correctIndex'] as int,
        explanation = j['explanation'] as String?,
        recorded = j['recorded'] as bool,
        notSavedReason = j['notSavedReason'] as String?;

  final bool isCorrect, recorded;
  final int correctIndex;
  final String? explanation;

  /// `signed-out`, `already-answered`, `own-question`, `rate-limited` or `error`.
  final String? notSavedReason;
}

class HistoryItem {
  HistoryItem.fromJson(Json j)
      : questionId = j['questionId'] as String,
        prompt = j['prompt'] as String,
        isCorrect = j['isCorrect'] as bool;

  final String questionId, prompt;
  final bool isCorrect;
}

class UserStats {
  UserStats.fromJson(Json j)
      : score = j['score'] as num,
        streak = j['streak'] as num,
        bestStreak = j['bestStreak'] as num,
        accuracy = j['accuracy'] as num,
        totalAnswered = j['totalAnswered'] as num;

  final num score, streak, bestStreak, accuracy, totalAnswered;
}

class LeaderboardEntry {
  LeaderboardEntry.fromJson(Json j)
      : userId = j['user_id'] as String,
        displayName = j['display_name'] as String?,
        score = j['score'] as num,
        accuracy = j['accuracy'] as num,
        rank = j['rank'] as num;

  final String userId;
  final String? displayName;
  final num score, accuracy, rank;
}

class Group {
  Group.fromJson(Json j)
      : id = j['id'] as String,
        name = j['name'] as String,
        description = j['description'] as String?,
        createdAt = j['created_at'] as String;

  final String id, name, createdAt;
  final String? description;
}

class SearchResult {
  SearchResult.fromJson(Json j)
      : id = j['id'] as String,
        prompt = j['prompt'] as String,
        category = j['category'] as String,
        authorName = j['authorName'] as String,
        createdAt = j['createdAt'] as String,
        score = j['score'] as num?;

  final String id, prompt, category, authorName, createdAt;
  final num? score;
}

class SearchResultPage {
  SearchResultPage.fromJson(Json j)
      : results = _list(j['results'], SearchResult.fromJson),
        hasMore = j['hasMore'] as bool;

  final List<SearchResult> results;
  final bool hasMore;
}

class TopicInfo {
  TopicInfo.fromJson(Json j)
      : name = j['name'] as String,
        questionCount = j['questionCount'] as num,
        latestAt = j['latestAt'] as String;

  final String name, latestAt;
  final num questionCount;
}

class CommentView {
  CommentView.fromJson(Json j)
      : id = j['id'] as String,
        body = j['body'] as String,
        authorName = j['authorName'] as String,
        createdAt = j['createdAt'] as String,
        mine = j['mine'] as bool;

  final String id, body, authorName, createdAt;
  final bool mine;
}

class DiscussionView {
  DiscussionView.fromJson(Json j)
      : ratingAverage = (j['rating'] as Json)['average'] as num?,
        ratingCount = (j['rating'] as Json)['count'] as num,
        myRating = j['myRating'] as num?,
        comments = _list(j['comments'], CommentView.fromJson),
        hasMore = j['hasMore'] as bool;

  final num? ratingAverage, myRating;
  final num ratingCount;
  final List<CommentView> comments;
  final bool hasMore;
}

class SuggestionView {
  SuggestionView.fromJson(Json j)
      : id = j['id'] as String,
        questionId = j['questionId'] as String,
        questionPrompt = j['questionPrompt'] as String,
        body = j['body'] as String,
        senderName = j['senderName'] as String,
        createdAt = j['createdAt'] as String,
        resolvedAt = j['resolvedAt'] as String?;

  final String id, questionId, questionPrompt, body, senderName, createdAt;
  final String? resolvedAt;
}

class QuestionAnalytics {
  QuestionAnalytics.fromJson(Json j)
      : questionId = j['question_id'] as String,
        prompt = j['prompt'] as String,
        playCount = j['play_count'] as num,
        accuracyRate = j['accuracy_rate'] as num;

  final String questionId, prompt;
  final num playCount, accuracyRate;
}

class UserQuizzes {
  UserQuizzes.fromJson(Json j)
      : quizzes = _list(j['quizzes'], ClientQuestion.fromJson),
        count = j['count'] as num;

  final List<ClientQuestion> quizzes;
  final num count;
}

class UpgradePackage {
  UpgradePackage({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    this.currency = 'USD',
    required this.interval,
    this.badge,
    this.savingsPercentage,
    required this.features,
  });

  UpgradePackage.fromJson(Json j)
      : id = j['id'] as String,
        name = j['name'] as String,
        description = j['description'] as String,
        price = (j['price'] as num).toDouble(),
        currency = j['currency'] as String? ?? 'USD',
        interval = j['interval'] as String,
        badge = j['badge'] as String?,
        savingsPercentage = (j['savingsPercentage'] as num?)?.toInt(),
        features = List<String>.from(j['features'] as List? ?? const []);

  final String id, name, description, currency, interval;
  final double price;
  final String? badge;
  final int? savingsPercentage;
  final List<String> features;

  Json toJson() => {
        'id': id,
        'name': name,
        'description': description,
        'price': price,
        'currency': currency,
        'interval': interval,
        if (badge != null) 'badge': badge,
        if (savingsPercentage != null) 'savingsPercentage': savingsPercentage,
        'features': features,
      };
}

class PackageTransaction {
  PackageTransaction({
    required this.transactionId,
    required this.packageId,
    required this.userId,
    required this.amount,
    this.currency = 'USD',
    required this.status,
    required this.gateway,
    required this.receipt,
    required this.startedAt,
    this.completedAt,
    this.errorReason,
  });

  PackageTransaction.fromJson(Json j)
      : transactionId = j['transactionId'] as String,
        packageId = j['packageId'] as String,
        userId = j['userId'] as String? ?? '',
        amount = (j['amount'] as num).toDouble(),
        currency = j['currency'] as String? ?? 'USD',
        status = j['status'] as String,
        gateway = j['gateway'] as String,
        receipt = j['receipt'] as String? ?? '',
        startedAt = j['startedAt'] as String,
        completedAt = j['completedAt'] as String?,
        errorReason = j['errorReason'] as String?;

  final String transactionId, packageId, userId, currency, status, gateway, receipt, startedAt;
  final double amount;
  final String? completedAt, errorReason;

  Json toJson() => {
        'transactionId': transactionId,
        'packageId': packageId,
        'userId': userId,
        'amount': amount,
        'currency': currency,
        'status': status,
        'gateway': gateway,
        'receipt': receipt,
        'startedAt': startedAt,
        if (completedAt != null) 'completedAt': completedAt,
        if (errorReason != null) 'errorReason': errorReason,
      };
}

