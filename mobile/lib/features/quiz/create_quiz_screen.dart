import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../../theme/app_theme.dart';
import '../../widgets/glass_card.dart';
import '../../services/tier/tier_provider.dart';
import '../../services/tier/session_quiz_store.dart';
import '../../db/quiz_repository.dart';
import '../auth/auth_screen.dart' show requireSignIn;

const List<String> kPredefinedTopics = [
  'General',
  'Web3',
  'Crypto',
  'DeFi',
  'Science',
  'Tech',
];

class CreateQuizScreen extends ConsumerStatefulWidget {
  const CreateQuizScreen({super.key});

  @override
  ConsumerState<CreateQuizScreen> createState() => _CreateQuizScreenState();
}

class _CreateQuizScreenState extends ConsumerState<CreateQuizScreen> {
  final _formKey = GlobalKey<FormState>();
  final _promptController = TextEditingController();
  final _customTopicController = TextEditingController();
  final List<TextEditingController> _optionControllers = List.generate(
    4,
    (_) => TextEditingController(),
  );

  String _selectedTopic = 'General';
  bool _isCreatingCustomTopic = false;
  int _correctIndex = 0;
  bool _isSubmitting = false;

  @override
  void dispose() {
    _promptController.dispose();
    _customTopicController.dispose();
    for (final c in _optionControllers) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    final tier = ref.read(tierProvider);
    final sessionStore = ref.read(sessionQuizStoreProvider);

    // Enforce Guest limit (max 20 session quizzes)
    if (tier.isGuest && sessionStore.isFull) {
      await showDialog<void>(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: AppColors.cyberViolet,
          title: const Text('Session Limit Reached (20/20)'),
          content: const Text(
            'Guests can only create up to 20 quizzes per session. '
            'Sign in to save your quizzes, sync with server, and unlock 100 quizzes!',
            style: TextStyle(color: AppColors.slate300),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Cancel', style: TextStyle(color: AppColors.slate400)),
            ),
            ElevatedButton(
              onPressed: () async {
                Navigator.of(ctx).pop();
                await requireSignIn(context, ref);
              },
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.neoMint, foregroundColor: AppColors.deepSpace),
              child: const Text('Sign In to Unlock'),
            ),
          ],
        ),
      );
      return;
    }

    // Determine topic name
    final topic = (_isCreatingCustomTopic && tier.canCreateCustomTopic)
        ? _customTopicController.text.trim()
        : _selectedTopic;

    if (topic.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select or specify a topic.')),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    final questionId = 'custom_${const Uuid().v4()}';
    final newQuestion = <String, dynamic>{
      'id': questionId,
      'prompt': _promptController.text.trim(),
      'question': _promptController.text.trim(),
      'category': topic,
      'options': _optionControllers.map((c) => c.text.trim()).toList(),
      'correct_index': _correctIndex,
      'created_by': tier.isGuest ? 'guest' : 'me',
      'created_at': DateTime.now().toIso8601String(),
    };

    try {
      if (tier.isGuest) {
        // Guest: save in memory only (no SQLite, no server sync)
        sessionStore.addQuestion(newQuestion);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Quiz added to session (Session only - not saved to disk).'),
            backgroundColor: AppColors.elevation2,
          ),
        );
      } else {
        // Authenticated Free / Pro: Save to local database
        await ref.read(quizRepositoryProvider).saveQuizList(
          name: 'Created: $topic',
          questions: [newQuestion],
        );
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Quiz created and saved successfully!'),
              backgroundColor: AppColors.elevation2,
            ),
          );
        }
      }

      if (mounted) {
        Navigator.of(context).pop(true);
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final tier = ref.watch(tierProvider);
    final sessionStore = ref.watch(sessionQuizStoreProvider);

    return Scaffold(
      backgroundColor: AppColors.deepSpace,
      appBar: AppBar(
        title: const Text('Create Quiz'),
        backgroundColor: Colors.transparent,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Quota & Tier Status Banner
                GlassCard(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Row(
                    children: [
                      Icon(
                        tier.isPro
                            ? Icons.star_rounded
                            : (tier.isAuthenticated ? Icons.verified_user_rounded : Icons.info_outline_rounded),
                        color: tier.isPro ? AppColors.gold : AppColors.neoMint,
                        size: 24,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              tier.label,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.foreground),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              tier.isGuest
                                  ? 'Quizzes: ${sessionStore.count} / 20 in session'
                                  : (tier.isPro ? 'Quizzes: Full Limit (Unlimited)' : 'Quizzes: up to 100 per list (80% Tier)'),
                              style: const TextStyle(fontSize: 12, color: AppColors.slate400),
                            ),
                          ],
                        ),
                      ),
                      if (tier.isGuest)
                        TextButton(
                          onPressed: () => requireSignIn(context, ref),
                          child: const Text('Unlock 100', style: TextStyle(color: AppColors.neoMint, fontWeight: FontWeight.bold)),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Question Prompt
                const Text('Question Prompt', style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.foreground)),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _promptController,
                  maxLines: 2,
                  maxLength: 500,
                  decoration: InputDecoration(
                    hintText: 'Enter your question here...',
                    hintStyle: const TextStyle(color: AppColors.slate400),
                    filled: true,
                    fillColor: AppColors.cyberViolet,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.cyberBorder)),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.cyberBorder)),
                    counterStyle: const TextStyle(color: AppColors.slate400, fontSize: 11),
                  ),
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return 'Please enter a question prompt';
                    if (v.trim().length > 500) return 'Question prompt cannot exceed 500 characters';
                    return null;
                  },
                ),
                const SizedBox(height: 16),

                // Category / Topic Section
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Topic / Category', style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.foreground)),
                    if (tier.canCreateCustomTopic)
                      TextButton.icon(
                        onPressed: () {
                          setState(() {
                            _isCreatingCustomTopic = !_isCreatingCustomTopic;
                          });
                        },
                        icon: Icon(_isCreatingCustomTopic ? Icons.list_rounded : Icons.add_rounded, size: 16),
                        label: Text(_isCreatingCustomTopic ? 'Pick from list' : '+ Custom Topic'),
                        style: TextButton.styleFrom(foregroundColor: AppColors.neoMint),
                      )
                    else
                      const Row(
                        children: [
                          Icon(Icons.lock_outline_rounded, size: 14, color: AppColors.slate400),
                          SizedBox(width: 4),
                          Text('Custom topic locked', style: TextStyle(fontSize: 12, color: AppColors.slate400)),
                        ],
                      ),
                  ],
                ),
                const SizedBox(height: 6),

                if (_isCreatingCustomTopic && tier.canCreateCustomTopic)
                  TextFormField(
                    controller: _customTopicController,
                    maxLength: 50,
                    decoration: InputDecoration(
                      hintText: 'Enter new topic name...',
                      hintStyle: const TextStyle(color: AppColors.slate400),
                      filled: true,
                      fillColor: AppColors.cyberViolet,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.cyberBorder)),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.cyberBorder)),
                      counterStyle: const TextStyle(color: AppColors.slate400, fontSize: 11),
                    ),
                    validator: (v) {
                      if (!_isCreatingCustomTopic) return null;
                      if (v == null || v.trim().isEmpty) return 'Please enter topic name';
                      if (v.trim().length > 50) return 'Topic name cannot exceed 50 characters';
                      return null;
                    },
                  )
                else
                  DropdownButtonFormField<String>(
                    initialValue: _selectedTopic,
                    dropdownColor: AppColors.cyberViolet,
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: AppColors.cyberViolet,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.cyberBorder)),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.cyberBorder)),
                    ),
                    items: kPredefinedTopics.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                    onChanged: (v) {
                      if (v != null) setState(() => _selectedTopic = v);
                    },
                  ),
                const SizedBox(height: 20),

                // Answers Section
                const Text('Answer Options (Select correct answer)', style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.foreground)),
                const SizedBox(height: 8),

                for (int i = 0; i < 4; i++)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Row(
                      children: [
                        ChoiceChip(
                          label: Text(String.fromCharCode(65 + i), style: TextStyle(fontWeight: FontWeight.bold, color: _correctIndex == i ? AppColors.deepSpace : AppColors.foreground)),
                          selected: _correctIndex == i,
                          selectedColor: AppColors.neoMint,
                          backgroundColor: AppColors.cyberViolet,
                          onSelected: (selected) {
                            if (selected) setState(() => _correctIndex = i);
                          },
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextFormField(
                            controller: _optionControllers[i],
                            maxLength: 200,
                            decoration: InputDecoration(
                              hintText: 'Option ${String.fromCharCode(65 + i)}',
                              hintStyle: const TextStyle(color: AppColors.slate400),
                              filled: true,
                              fillColor: AppColors.cyberViolet,
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.cyberBorder)),
                              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.cyberBorder)),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              counterText: '',
                            ),
                            validator: (v) {
                              if (v == null || v.trim().isEmpty) return 'Required';
                              if (v.trim().length > 200) return 'Option cannot exceed 200 characters';
                              return null;
                            },
                          ),
                        ),
                      ],
                    ),
                  ),

                const SizedBox(height: 24),

                // Submit Button
                ElevatedButton(
                  onPressed: _isSubmitting ? null : _handleSubmit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.neoMint,
                    foregroundColor: AppColors.deepSpace,
                    minimumSize: const Size.fromHeight(50),
                    textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _isSubmitting
                      ? const CircularProgressIndicator(color: AppColors.deepSpace)
                      : const Text('Add Quiz Question'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
