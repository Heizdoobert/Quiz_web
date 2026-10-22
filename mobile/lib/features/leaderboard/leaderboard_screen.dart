import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/theme/app_theme.dart';
import 'package:mobile/widgets/glass_card.dart';
import '../quiz/board_provider.dart';
import '../groups/challenge_group_screen.dart';

class LeaderboardScreen extends ConsumerWidget {
  const LeaderboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final boardAsync = ref.watch(boardProvider);

    return Scaffold(
      backgroundColor: AppColors.deepSpace,
      appBar: AppBar(
        title: const Text('Global Leaderboard'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        actions: [
          IconButton(
            key: const Key('challenge_groups_btn'),
            icon: const Icon(Icons.groups_rounded, color: AppColors.gold),
            tooltip: 'Challenge Groups (Pro)',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const ChallengeGroupScreen()),
              );
            },
          ),
        ],
      ),
      body: SafeArea(
        child: boardAsync.when(
          loading: () => const Center(
            child: CircularProgressIndicator(color: AppColors.neoMint),
          ),
          error: (err, _) => Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.cloud_off_rounded, size: 48, color: AppColors.slate400),
                const SizedBox(height: 12),
                const Text(
                  'Failed to load leaderboard',
                  style: TextStyle(color: AppColors.foreground, fontSize: 16),
                ),
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  onPressed: () => ref.invalidate(boardProvider),
                  icon: const Icon(Icons.refresh_rounded),
                  label: const Text('Retry'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.neoMint,
                    foregroundColor: AppColors.deepSpace,
                  ),
                ),
              ],
            ),
          ),
          data: (board) {
            final list = board.leaderboard;
            if (list.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.emoji_events_outlined, size: 64, color: AppColors.slate500),
                    const SizedBox(height: 12),
                    const Text(
                      'No leaderboard data yet',
                      style: TextStyle(color: AppColors.slate300, fontSize: 16),
                    ),
                    const SizedBox(height: 8),
                    TextButton(
                      onPressed: () => ref.invalidate(boardProvider),
                      child: const Text('Refresh', style: TextStyle(color: AppColors.neoMint)),
                    ),
                  ],
                ),
              );
            }

            return RefreshIndicator(
              color: AppColors.neoMint,
              backgroundColor: AppColors.cyberViolet,
              onRefresh: () async => ref.refresh(boardProvider.future),
              child: Column(
                children: [
                  Container(
                    margin: EdgeInsets.fromLTRB(Responsive(context).scale(16), Responsive(context).scale(8), Responsive(context).scale(16), Responsive(context).scale(4)),
                    padding: EdgeInsets.symmetric(horizontal: Responsive(context).scale(14), vertical: Responsive(context).scale(10)),
                    decoration: BoxDecoration(
                      color: AppColors.cyberViolet,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.cyberBorder),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.workspace_premium_rounded, color: AppColors.gold, size: 22),
                        const SizedBox(width: 10),
                        const Expanded(
                          child: Text(
                            'Open Challenge Groups to cross top ranks faster!',
                            style: TextStyle(
                              color: AppColors.foreground,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        TextButton(
                          key: const Key('leaderboard_open_groups_link'),
                          onPressed: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(builder: (_) => const ChallengeGroupScreen()),
                            );
                          },
                          child: const Text(
                            'Groups',
                            style: TextStyle(
                              color: AppColors.neoMint,
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: ListView.separated(
                      padding: EdgeInsets.symmetric(horizontal: Responsive(context).scale(16), vertical: Responsive(context).scale(12)),
                      itemCount: list.length,
                      separatorBuilder: (context, index) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final entry = list[index];
                        final rank = (entry['rank'] as num?)?.toInt() ?? (index + 1);
                        final name = (entry['display_name'] as String?)?.isNotEmpty == true
                            ? entry['display_name'] as String
                            : 'Player ${entry['user_id']?.toString().substring(0, 4) ?? '$rank'}';
                        final score = (entry['score'] as num?)?.toInt() ?? 0;
                        final accuracy = (entry['accuracy'] as num?)?.toInt() ?? 0;

                        return _LeaderboardRow(
                          rank: rank,
                          displayName: name,
                          score: score,
                          accuracy: accuracy,
                        );
                      },
                    ),
                  ),

                  // Current user pinned stats
                  Container(
                    padding: EdgeInsets.all(Responsive(context).scale(16)),
                    decoration: BoxDecoration(
                      color: AppColors.cyberViolet,
                      border: const Border(top: BorderSide(color: AppColors.cyberBorder)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.3),
                          blurRadius: 10,
                          offset: const Offset(0, -2),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const CircleAvatar(
                              backgroundColor: AppColors.neoMint,
                              radius: 18,
                              child: Icon(Icons.person, color: AppColors.deepSpace, size: 20),
                            ),
                            const SizedBox(width: 10),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Your Score',
                                  style: TextStyle(fontSize: 12, color: AppColors.slate400),
                                ),
                                Text(
                                  '${board.score} pts',
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.foreground,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                        Row(
                          children: [
                            _MiniBadge(label: 'Accuracy', value: '${board.accuracy}%', color: AppColors.electricIndigo),
                            const SizedBox(width: 8),
                            _MiniBadge(label: 'Streak', value: '${board.streak} 🔥', color: AppColors.popCoral),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _LeaderboardRow extends StatelessWidget {
  const _LeaderboardRow({
    required this.rank,
    required this.displayName,
    required this.score,
    required this.accuracy,
  });

  final int rank;
  final String displayName;
  final int score;
  final int accuracy;

  @override
  Widget build(BuildContext context) {
    Color rankColor = AppColors.slate400;
    Widget? rankBadge;

    if (rank == 1) {
      rankColor = AppColors.gold;
      rankBadge = const Icon(Icons.emoji_events_rounded, color: AppColors.gold, size: 22);
    } else if (rank == 2) {
      rankColor = AppColors.slate200;
      rankBadge = const Icon(Icons.military_tech_rounded, color: AppColors.slate200, size: 22);
    } else if (rank == 3) {
      rankColor = const Color(0xFFCD7F32); // Bronze
      rankBadge = const Icon(Icons.military_tech_rounded, color: Color(0xFFCD7F32), size: 22);
    }

    return GlassCard(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Row(
          children: [
            SizedBox(
              width: 32,
              child: Center(
                child: rankBadge ??
                    Text(
                      '#$rank',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                        color: rankColor,
                      ),
                    ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    displayName,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                      color: AppColors.foreground,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Accuracy: $accuracy%',
                    style: const TextStyle(fontSize: 12, color: AppColors.slate400),
                  ),
                ],
              ),
            ),
            Text(
              '$score pts',
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 15,
                color: AppColors.neoMint,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MiniBadge extends StatelessWidget {
  const _MiniBadge({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        border: Border.all(color: color.withValues(alpha: 0.4)),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          Text(label, style: const TextStyle(fontSize: 10, color: AppColors.slate400)),
          Text(
            value,
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: color),
          ),
        ],
      ),
    );
  }
}
