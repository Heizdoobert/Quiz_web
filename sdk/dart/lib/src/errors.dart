/// Every failure the SDK raises: network, timeout, bad JSON, or a non-2xx answer.
/// Same codes as the TypeScript `QuickQuizError`.
class QuickQuizError implements Exception {
  QuickQuizError(this.code, this.message, this.status, [this.details]);

  final String code;
  final String message;
  final int status;
  final Object? details;

  @override
  String toString() => 'QuickQuizError($code, $status): $message';
}
