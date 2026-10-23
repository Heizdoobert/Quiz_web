import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/theme/app_theme.dart';
import '../db/quiz_repository.dart';
import '../features/auth/auth_provider.dart';
import '../features/auth/auth_screen.dart' show requireSignIn;

/// Prompts the user whether they want to save the current quiz list for later reuse.
/// Provides two explicit options: "Save" and "Don't Save".
/// Returns true if saved, or false if not saved / cancelled.
Future<bool> promptSaveQuizDialog(
  BuildContext context,
  WidgetRef ref, {
  required List<Map<String, dynamic>> questions,
  String? defaultName,
}) async {
  if (questions.isEmpty) return false;

  final shouldSave = await showDialog<bool>(
    context: context,
    builder: (dialogCtx) => AlertDialog(
      backgroundColor: AppColors.cyberViolet,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.cyberBorder),
      ),
      title: Row(
        children: const [
          Icon(Icons.bookmark_add_rounded, color: AppColors.neoMint),
          SizedBox(width: 8),
          Text(
            'Save Quiz List?',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: AppColors.foreground,
            ),
          ),
        ],
      ),
      content: const Text(
        'Do you want to save this quiz list so you can reload and reuse it later?',
        style: TextStyle(fontSize: 14, color: AppColors.slate300, height: 1.4),
      ),
      actionsPadding: const EdgeInsets.symmetric(horizontal: Responsive(context).scale(16), vertical: Responsive(context).scale(12)),
      actions: [
        // Option 2: Don't Save
        OutlinedButton(
          onPressed: () => Navigator.of(dialogCtx).pop(false),
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.slate400,
            side: const BorderSide(color: AppColors.cyberBorder),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          ),
          child: const Text("Don't Save"),
        ),
        // Option 1: Save
        ElevatedButton(
          onPressed: () => Navigator.of(dialogCtx).pop(true),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.neoMint,
            foregroundColor: AppColors.deepSpace,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            textStyle: const TextStyle(fontWeight: FontWeight.bold),
          ),
          child: const Text('Save'),
        ),
      ],
    ),
  );

  if (shouldSave != true) {
    return false;
  }

  // If user selected "Save", check authentication.
  // If not authenticated, requireSignIn presents the sign-in modal.
  if (!context.mounted) return false;
  final isAuthenticated = ref.read(authProvider).isAuthenticated;
  if (!isAuthenticated) {
    final signedIn = await requireSignIn(context, ref);
    if (!signedIn || !context.mounted) {
      return false;
    }
  }

  final name = defaultName ?? 'Quiz Set (${DateTime.now().toLocal().toString().split('.').first})';
  await ref.read(quizRepositoryProvider).saveQuizList(
    name: name,
    questions: questions,
  );

  if (context.mounted) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Quiz list saved for reuse!'),
        backgroundColor: AppColors.elevation2,
      ),
    );
  }

  return true;
}
