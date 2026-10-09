import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme/app_theme.dart';
import '../../widgets/glass_card.dart';
import '../auth/auth_provider.dart';
import '../auth/auth_screen.dart' show BrandMark, requireSignIn;
import 'board_panels.dart';
import 'board_provider.dart';
import 'quiz_provider.dart';

typedef Question = Map<String, dynamic>;

const _letters = ['A', 'B', 'C', 'D'];

/// One question at a time, laid out like the web's QuestionFront / AnswerBack flip card.
/// Answers are queued offline, so the correct option is not shown here: the server only
/// reveals it (and scores it) when the queue syncs.
class QuizScreen extends ConsumerStatefulWidget {
  const QuizScreen({super.key});

  @override
  ConsumerState<QuizScreen> createState() => _QuizScreenState();
}

class _QuizScreenState extends ConsumerState<QuizScreen> {
  static const _all = 'All';

  String _category = _all;
  // Answered or skipped this session; the answered question stays on screen until Next.
  final Set<String> _seen = {};
  String? _pickedId;
  int? _pickedIndex;

  List<String> _topics(List<Question> qs) =>
      [_all, ...{for (final q in qs) if ((q['category'] as String?)?.isNotEmpty ?? false) q['category'] as String}];

  Question? _current(List<Question> qs) {
    if (_pickedId != null) {
      for (final q in qs) {
        if (q['id'] == _pickedId) return q;
      }
    }
    for (final q in qs) {
      final inTopic = _category == _all || q['category'] == _category;
      if (inTopic && !_seen.contains(q['id'])) return q;
    }
    return null;
  }

  Future<void> _answer(Question q, int index) async {
    // Playing needs an account, so the first pick asks a guest to sign in.
    if (!await requireSignIn(context, ref) || !mounted) return;
    ref.read(quizProvider.notifier).submitAnswer(q['id'] as String, index);
    setState(() {
      _pickedId = q['id'] as String;
      _pickedIndex = index;
    });
  }

  void _next(Question q) {
    setState(() {
      _seen.add(q['id'] as String);
      _pickedId = null;
      _pickedIndex = null;
    });
  }

  // The web's centre column: category bar, then the question card.
  Widget _quizColumn(List<Question> qs) {
    final current = _current(qs);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _CategoryBar(
          topics: _topics(qs),
          selected: _category,
          onSelect: (t) => setState(() {
            _category = t;
            _pickedId = null;
            _pickedIndex = null;
          }),
        ),
        const SizedBox(height: 16),
        if (qs.isEmpty)
          const _Message(text: 'No questions available offline.')
        else if (current == null)
          const _Message(text: 'You have gone through every question here. Pull a fresh set with refresh.')
        else if (_pickedId != null)
          _AnswerCard(question: current, pickedIndex: _pickedIndex!, onNext: () => _next(current))
        else
          _QuestionCard(
            question: current,
            onPick: (i) => _answer(current, i),
            onSkip: () => _next(current),
          ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final quiz = ref.watch(quizProvider);
    final boardAsync = ref.watch(boardProvider);
    final board = boardAsync.value ?? const Board();
    // Signing in or out changes whose stats and history the board shows.
    ref.listen(authProvider.select((a) => a.isAuthenticated), (_, _) => ref.invalidate(boardProvider));

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            _Header(pending: quiz.pendingSyncCount),
            Expanded(
              child: quiz.questions.when(
                loading: () => const Center(child: CircularProgressIndicator(color: AppColors.neoMint)),
                error: (err, _) => _Message(text: 'Could not load questions.\n$err'),
                data: (qs) {
                  final scoreboard = ScoreboardPanel(board: board);
                  final leaderboard = LeaderboardPanel(
                    entries: board.leaderboard,
                    loading: boardAsync.isLoading && !boardAsync.hasValue,
                  );
                  return LayoutBuilder(
                    builder: (context, constraints) {
                      // Same breakpoint as the web's lg:grid-cols-12: scoreboard 3, quiz 6, leaderboard 3.
                      final wide = constraints.maxWidth >= 1024;
                      return SingleChildScrollView(
                        padding: const EdgeInsets.fromLTRB(16, 24, 16, 24),
                        child: Center(
                          child: ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 1152),
                            child: wide
                                ? Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Expanded(flex: 3, child: scoreboard),
                                      const SizedBox(width: 24),
                                      Expanded(flex: 6, child: _quizColumn(qs)),
                                      const SizedBox(width: 24),
                                      Expanded(flex: 3, child: leaderboard),
                                    ],
                                  )
                                : Column(
                                    crossAxisAlignment: CrossAxisAlignment.stretch,
                                    children: [
                                      _quizColumn(qs),
                                      const SizedBox(height: 24),
                                      scoreboard,
                                      const SizedBox(height: 24),
                                      leaderboard,
                                    ],
                                  ),
                          ),
                        ),
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Header extends ConsumerWidget {
  const _Header({required this.pending});

  final int pending;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: const BoxDecoration(
        color: Color(0x9914163A),
        border: Border(bottom: BorderSide(color: AppColors.cyberBorder)),
      ),
      child: Row(
        children: [
          const Expanded(child: Align(alignment: Alignment.centerLeft, child: BrandMark(size: 18))),
          if (pending > 0)
            Padding(
              padding: const EdgeInsets.only(right: 4),
              child: _Pill(
                icon: Icons.cloud_upload_outlined,
                label: '$pending',
                color: AppColors.gold,
              ),
            ),
          _HeaderButton(
            icon: Icons.refresh,
            tooltip: 'Refresh questions',
            onTap: () {
              ref.read(quizProvider.notifier).loadData();
              ref.invalidate(boardProvider);
            },
          ),
          if (auth.isAuthenticated)
            _HeaderButton(
              icon: Icons.logout,
              tooltip: 'Sign out',
              onTap: () => ref.read(quizProvider.notifier).signOut(),
            )
          else
            Padding(
              padding: const EdgeInsets.only(left: 6),
              child: GradientButton(
                label: 'Sign In',
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                onPressed: () => requireSignIn(context, ref),
              ),
            ),
        ],
      ),
    );
  }
}

class _HeaderButton extends StatelessWidget {
  const _HeaderButton({required this.icon, required this.tooltip, required this.onTap});

  final IconData icon;
  final String tooltip;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 6),
      child: Material(
        color: AppColors.cyberVioletLight,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: Color(0xFF3A3E70)),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: onTap,
          child: Tooltip(
            message: tooltip,
            child: Padding(
              padding: const EdgeInsets.all(8),
              child: Icon(icon, size: 18, color: AppColors.neoMint),
            ),
          ),
        ),
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill({required this.icon, required this.label, required this.color});

  final IconData icon;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        border: Border.all(color: color.withValues(alpha: 0.4)),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(fontFamily: headingFont, fontSize: 11, fontWeight: FontWeight.bold, color: color),
          ),
        ],
      ),
    );
  }
}

class _CategoryBar extends StatelessWidget {
  const _CategoryBar({required this.topics, required this.selected, required this.onSelect});

  final List<String> topics;
  final String selected;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 36,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: topics.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, i) {
          final topic = topics[i];
          final isSelected = topic == selected;
          return GestureDetector(
            onTap: () => onSelect(topic),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: isSelected ? AppColors.neoMint : AppColors.cyberViolet.withValues(alpha: 0.6),
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: isSelected ? AppColors.neoMint : AppColors.cyberBorder),
              ),
              child: Row(
                children: [
                  Icon(
                    i == 0 ? Icons.layers_outlined : Icons.tag,
                    size: 14,
                    color: isSelected ? AppColors.deepSpace : AppColors.slate400,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    i == 0 ? 'All Topics' : topic,
                    style: TextStyle(
                      fontFamily: headingFont,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: isSelected ? AppColors.deepSpace : AppColors.slate400,
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _CategoryBadge extends StatelessWidget {
  const _CategoryBadge({required this.question});

  final Question question;

  @override
  Widget build(BuildContext context) {
    final category = (question['category'] as String?)?.trim();
    final color = AppColors.forCategory(category);
    final createdBy = question['created_by'] as String?;
    return Wrap(
      spacing: 8,
      runSpacing: 6,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.15),
            border: Border.all(color: color.withValues(alpha: 0.4)),
            borderRadius: BorderRadius.circular(999),
          ),
          child: Text(
            (category == null || category.isEmpty ? 'Trivia' : category).toUpperCase(),
            style: TextStyle(fontFamily: headingFont, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1, color: color),
          ),
        ),
        if (createdBy != null && createdBy.isNotEmpty)
          const _Pill(icon: Icons.groups_outlined, label: 'Community', color: AppColors.gold)
        else
          const _Pill(icon: Icons.verified_user_outlined, label: 'Verified', color: AppColors.neoMint),
      ],
    );
  }
}

class _QuestionCard extends StatelessWidget {
  const _QuestionCard({required this.question, required this.onPick, required this.onSkip});

  final Question question;
  final ValueChanged<int> onPick;
  final VoidCallback onSkip;

  @override
  Widget build(BuildContext context) {
    final options = List<String>.from(question['options'] as List);
    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(child: _CategoryBadge(question: question)),
              _SkipButton(onTap: onSkip),
            ],
          ),
          const Padding(padding: EdgeInsets.only(top: 14), child: Divider(height: 1, color: AppColors.cyberBorder)),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 24),
            child: Text(
              question['prompt'] as String,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, height: 1.5, color: Colors.white),
            ),
          ),
          for (var i = 0; i < options.length && i < _letters.length; i++) ...[
            _OptionTile(letter: _letters[i], text: options[i], onTap: () => onPick(i)),
            if (i < options.length - 1) const SizedBox(height: 12),
          ],
        ],
      ),
    );
  }
}

class _SkipButton extends StatelessWidget {
  const _SkipButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.deepSpace.withValues(alpha: 0.8),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(10),
        side: const BorderSide(color: AppColors.cyberBorder),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: onTap,
        child: const Padding(
          padding: EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.fast_forward, size: 14, color: AppColors.electricIndigo),
              SizedBox(width: 4),
              Text('Skip', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate300)),
            ],
          ),
        ),
      ),
    );
  }
}

class _OptionTile extends StatelessWidget {
  const _OptionTile({required this.letter, required this.text, this.onTap, this.picked = false, this.dimmed = false});

  final String letter;
  final String text;
  final VoidCallback? onTap;
  final bool picked;
  final bool dimmed;

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: dimmed ? 0.6 : 1,
      child: Material(
        color: picked ? const Color(0xFF222344) : const Color(0xCC131428),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: picked ? AppColors.neoMint : AppColors.cyberBorder),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: picked ? AppColors.neoMint.withValues(alpha: 0.2) : AppColors.cyberViolet,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: picked ? AppColors.neoMint : AppColors.cyberBorder),
                  ),
                  child: Text(
                    letter,
                    style: TextStyle(
                      fontFamily: headingFont,
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                      color: picked ? AppColors.neoMint : AppColors.slate300,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Text(text, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: AppColors.slate200)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// The web's AnswerBack banner, worded for an answer that is only queued so far.
class _AnswerCard extends StatelessWidget {
  const _AnswerCard({required this.question, required this.pickedIndex, required this.onNext});

  final Question question;
  final int pickedIndex;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    final options = List<String>.from(question['options'] as List);
    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.neoMint.withValues(alpha: 0.1),
              border: Border.all(color: AppColors.neoMint.withValues(alpha: 0.4)),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Row(
              children: [
                Icon(Icons.check_circle_outline, size: 32, color: AppColors.neoMint),
                SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Answer saved',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.neoMint),
                      ),
                      Text(
                        'Queued offline. It is scored once, when it syncs.',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.neoMint),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 20),
            child: Text(
              question['prompt'] as String,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, height: 1.5, color: Colors.white),
            ),
          ),
          for (var i = 0; i < options.length && i < _letters.length; i++) ...[
            _OptionTile(letter: _letters[i], text: options[i], picked: i == pickedIndex, dimmed: i != pickedIndex),
            if (i < options.length - 1) const SizedBox(height: 10),
          ],
          const SizedBox(height: 20),
          Align(
            alignment: Alignment.centerRight,
            child: GradientButton(label: 'Next Question', icon: Icons.arrow_forward, onPressed: onNext),
          ),
        ],
      ),
    );
  }
}

class _Message extends StatelessWidget {
  const _Message({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Center(
        child: Text(text, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.slate400, fontSize: 14, height: 1.5)),
      ),
    );
  }
}
