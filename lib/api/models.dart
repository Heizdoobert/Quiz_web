/// Dart models generated from the Web Quiz OpenAPI spec
/// These classes correspond to the API contract and are used by the Flutter client.

class QuizSummary {
  final String id;
  final String title;
  final String category;
  final int questionCount;

  QuizSummary({
    required this.id,
    required this.title,
    required this.category,
    required this.questionCount,
  });

  factory QuizSummary.fromJson(Map<String, dynamic> json) => QuizSummary(
        id: json['id'] as String,
        title: json['title'] as String,
        category: json['category'] as String,
        questionCount: json['questionCount'] as int,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'category': category,
        'questionCount': questionCount,
      };
}

class Question {
  final String id;
  final String text;
  final List<String> options;
  final int? correctOptionIndex; // optional on GET

  Question({
    required this.id,
    required this.text,
    required this.options,
    this.correctOptionIndex,
  });

  factory Question.fromJson(Map<String, dynamic> json) => Question(
        id: json['id'] as String,
        text: json['text'] as String,
        options: List<String>.from(json['options'] as List),
        correctOptionIndex: json['correctOptionIndex'] as int?,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'text': text,
        'options': options,
        if (correctOptionIndex != null) 'correctOptionIndex': correctOptionIndex,
      };
}

class Quiz {
  final String id;
  final String title;
  final String? description;
  final String category;
  final List<Question> questions;

  Quiz({
    required this.id,
    required this.title,
    this.description,
    required this.category,
    required this.questions,
  });

  factory Quiz.fromJson(Map<String, dynamic> json) => Quiz(
        id: json['id'] as String,
        title: json['title'] as String,
        description: json['description'] as String?,
        category: json['category'] as String,
        questions: (json['questions'] as List)
            .map((e) => Question.fromJson(e as Map<String, dynamic>))
            .toList(),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        if (description != null) 'description': description,
        'category': category,
        'questions': questions.map((q) => q.toJson()).toList(),
      };
}

class NewQuizRequest {
  final String title;
  final String? description;
  final String category;
  final List<Question> questions;

  NewQuizRequest({
    required this.title,
    this.description,
    required this.category,
    required this.questions,
  });

  Map<String, dynamic> toJson() => {
        'title': title,
        if (description != null) 'description': description,
        'category': category,
        'questions': questions.map((q) => q.toJson()).toList(),
      };
}

class SubmitAnswer {
  final String userId;
  final List<AnswerItem> answers;

  SubmitAnswer({required this.userId, required this.answers});

  Map<String, dynamic> toJson() => {
        'userId': userId,
        'answers': answers.map((a) => a.toJson()).toList(),
      };
}

class AnswerItem {
  final String questionId;
  final int selectedOptionIndex;

  AnswerItem({required this.questionId, required this.selectedOptionIndex});

  Map<String, dynamic> toJson() => {
        'questionId': questionId,
        'selectedOptionIndex': selectedOptionIndex,
      };
}

class SubmitResult {
  final int score;
  final int totalQuestions;
  final bool passed;
  final List<ResultItem> results;

  SubmitResult({
    required this.score,
    required this.totalQuestions,
    required this.passed,
    required this.results,
  });

  factory SubmitResult.fromJson(Map<String, dynamic> json) => SubmitResult(
        score: json['score'] as int,
        totalQuestions: json['totalQuestions'] as int,
        passed: json['passed'] as bool,
        results: (json['results'] as List)
            .map((e) => ResultItem.fromJson(e as Map<String, dynamic>))
            .toList(),
      );

  Map<String, dynamic> toJson() => {
        'score': score,
        'totalQuestions': totalQuestions,
        'passed': passed,
        'results': results.map((r) => r.toJson()).toList(),
      };
}

class ResultItem {
  final String questionId;
  final bool isCorrect;
  final int correctOptionIndex;

  ResultItem({
    required this.questionId,
    required this.isCorrect,
    required this.correctOptionIndex,
  });

  factory ResultItem.fromJson(Map<String, dynamic> json) => ResultItem(
        questionId: json['questionId'] as String,
        isCorrect: json['isCorrect'] as bool,
        correctOptionIndex: json['correctOptionIndex'] as int,
      );

  Map<String, dynamic> toJson() => {
        'questionId': questionId,
        'isCorrect': isCorrect,
        'correctOptionIndex': correctOptionIndex,
      };
}
