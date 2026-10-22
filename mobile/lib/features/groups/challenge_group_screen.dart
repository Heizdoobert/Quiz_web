import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme/app_theme.dart';
import '../../widgets/glass_card.dart';
import '../../widgets/upgrade_pro_modal.dart';
import '../../services/tier/tier_provider.dart';
import 'group_provider.dart';

class ChallengeGroupScreen extends ConsumerStatefulWidget {
  const ChallengeGroupScreen({super.key});

  @override
  ConsumerState<ChallengeGroupScreen> createState() => _ChallengeGroupScreenState();
}

class _ChallengeGroupScreenState extends ConsumerState<ChallengeGroupScreen> {
  void _openCreateGroupDialog() {
    final titleController = TextEditingController();
    final topicController = TextEditingController(text: 'General');
    final descController = TextEditingController();

    showDialog<void>(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        backgroundColor: AppColors.cyberViolet,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: AppColors.cyberBorder),
        ),
        title: const Row(
          children: [
            Icon(Icons.workspace_premium_rounded, color: AppColors.gold, size: 24),
            SizedBox(width: 8),
            Text(
              'Open Challenge Group',
              style: TextStyle(color: AppColors.foreground, fontSize: 18, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                key: const Key('group_title_field'),
                controller: titleController,
                maxLength: 60,
                decoration: const InputDecoration(
                  labelText: 'Group Title',
                  hintText: 'e.g. DeFi Masters Arena',
                  counterText: '',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                key: const Key('group_topic_field'),
                controller: topicController,
                maxLength: 40,
                decoration: const InputDecoration(
                  labelText: 'Topic / Category',
                  hintText: 'e.g. Flutter, Web3, Tech',
                  counterText: '',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                key: const Key('group_desc_field'),
                controller: descController,
                maxLength: 250,
                decoration: const InputDecoration(
                  labelText: 'Description',
                  hintText: 'Rules and challenge details...',
                  counterText: '',
                ),
                maxLines: 2,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(),
            child: const Text('Cancel', style: TextStyle(color: AppColors.slate400)),
          ),
          ElevatedButton(
            key: const Key('create_group_submit_button'),
            onPressed: () {
              final title = titleController.text.trim();
              if (title.isEmpty) return;

              final newGroup = ChallengeGroup(
                id: 'grp-${DateTime.now().millisecondsSinceEpoch}',
                title: title,
                topic: topicController.text.trim().isEmpty ? 'General' : topicController.text.trim(),
                description: descController.text.trim().isEmpty
                    ? 'Challenger battleground for competitive top-rankers.'
                    : descController.text.trim(),
                creator: 'You (Pro)',
                memberCount: 1,
                rankMultiplier: 2.0,
                leaderboard: [
                  ChallengeGroupMember(name: 'You', score: 100, rank: 1, isChallenger: true),
                ],
              );

              ref.read(challengeGroupProvider.notifier).addGroup(newGroup);
              Navigator.of(dialogCtx).pop();

              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Challenge Group "$title" created!'),
                  backgroundColor: AppColors.elevation2,
                ),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.neoMint,
              foregroundColor: AppColors.deepSpace,
            ),
            child: const Text('Create Group'),
          ),
        ],
      ),
    );
  }

  void _showGroupLeaderboard(ChallengeGroup group) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: AppColors.cyberViolet,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        side: BorderSide(color: AppColors.cyberBorder),
      ),
      builder: (sheetCtx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                const Icon(Icons.leaderboard_rounded, color: AppColors.gold, size: 24),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '${group.title} Leaderboard',
                    style: const TextStyle(
                      color: AppColors.foreground,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              '${group.rankMultiplier}x Challenger Rank Multiplier Active',
              style: const TextStyle(color: AppColors.neoMint, fontSize: 13, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 16),
            Flexible(
              child: ListView.separated(
                shrinkWrap: true,
                itemCount: group.leaderboard.length,
                separatorBuilder: (context, index) => const SizedBox(height: 8),
                itemBuilder: (context, idx) {
                  final member = group.leaderboard[idx];
                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: AppColors.cyberVioletLight,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: member.isChallenger
                            ? AppColors.gold.withValues(alpha: 0.5)
                            : AppColors.cyberBorder,
                      ),
                    ),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 12,
                          backgroundColor: idx == 0
                              ? AppColors.gold
                              : (idx == 1 ? Colors.grey.shade400 : Colors.brown.shade400),
                          child: Text(
                            '${member.rank}',
                            style: const TextStyle(
                              color: AppColors.deepSpace,
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Row(
                            children: [
                              Text(
                                member.name,
                                style: const TextStyle(
                                  color: AppColors.foreground,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              if (member.isChallenger) ...[
                                const SizedBox(width: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: AppColors.gold.withValues(alpha: 0.2),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: const Text(
                                    'PRO',
                                    style: TextStyle(
                                      color: AppColors.gold,
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                        Text(
                          '${member.score} pts',
                          style: const TextStyle(
                            color: AppColors.neoMint,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => Navigator.of(sheetCtx).pop(),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.neoMint,
                foregroundColor: AppColors.deepSpace,
              ),
              child: const Text('Close'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final groups = ref.watch(challengeGroupProvider);
    final tier = ref.watch(tierProvider);

    return Scaffold(
      backgroundColor: AppColors.deepSpace,
      appBar: AppBar(
        title: const Text('Challenge Groups'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
      ),
      floatingActionButton: FloatingActionButton.extended(
        key: const Key('open_group_fab'),
        onPressed: () {
          if (!tier.canCreateChallengeGroup) {
            showUpgradeProModal(context, ref);
          } else {
            _openCreateGroupDialog();
          }
        },
        icon: const Icon(Icons.add_moderator_rounded, color: AppColors.deepSpace),
        label: const Text(
          'Open Group',
          style: TextStyle(color: AppColors.deepSpace, fontWeight: FontWeight.bold),
        ),
        backgroundColor: AppColors.neoMint,
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
          children: [
            // Pro status / Upgrade callout banner
            if (tier.isPro)
              Container(
                padding: const EdgeInsets.all(14),
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      AppColors.gold.withValues(alpha: 0.15),
                      AppColors.cyberVioletLight,
                    ],
                  ),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.gold.withValues(alpha: 0.4)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.workspace_premium_rounded, color: AppColors.gold, size: 28),
                    SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '👑 Pro Challenger Active',
                            style: TextStyle(
                              color: AppColors.gold,
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'You have full limits: open challenge groups & climb ranks faster.',
                            style: TextStyle(color: AppColors.slate300, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              )
            else
              Container(
                padding: const EdgeInsets.all(14),
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: AppColors.cyberViolet,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.cyberBorder),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.lock_outline_rounded, color: AppColors.neoMint, size: 26),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Unlock Pro for Challenge Groups',
                            style: TextStyle(
                              color: AppColors.foreground,
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'Open groups to challenge friends and cross top leaderboards.',
                            style: TextStyle(color: AppColors.slate400, fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton(
                      key: const Key('challenge_upgrade_pro_btn'),
                      onPressed: () => showUpgradeProModal(context, ref),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.neoMint,
                        foregroundColor: AppColors.deepSpace,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                      child: const Text('Upgrade'),
                    ),
                  ],
                ),
              ),

            // Section header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Active Challenger Arenas',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.foreground,
                  ),
                ),
                Text(
                  '${groups.length} groups',
                  style: const TextStyle(fontSize: 12, color: AppColors.slate400),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Group List
            ...groups.map((group) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: GlassCard(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    group.title,
                                    style: const TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.foreground,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    group.description,
                                    style: const TextStyle(fontSize: 12, color: AppColors.slate400),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.gold.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: AppColors.gold.withValues(alpha: 0.5)),
                              ),
                              child: Text(
                                '${group.rankMultiplier}x Rank',
                                style: const TextStyle(
                                  color: AppColors.gold,
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppColors.cyberVioletLight,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                group.topic,
                                style: const TextStyle(color: AppColors.neoMint, fontSize: 11),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Icon(Icons.people_outline_rounded, size: 14, color: AppColors.slate400),
                            const SizedBox(width: 4),
                            Text(
                              '${group.memberCount} Challengers',
                              style: const TextStyle(fontSize: 11, color: AppColors.slate400),
                            ),
                            const Spacer(),
                            Text(
                              'Host: ${group.creator}',
                              style: const TextStyle(fontSize: 11, color: AppColors.slate400),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton.icon(
                            key: Key('view_group_${group.id}'),
                            onPressed: () => _showGroupLeaderboard(group),
                            icon: const Icon(Icons.emoji_events_outlined, size: 16, color: AppColors.gold),
                            label: const Text(
                              'View Group Leaderboard',
                              style: TextStyle(color: AppColors.gold, fontWeight: FontWeight.w600),
                            ),
                            style: OutlinedButton.styleFrom(
                              side: BorderSide(color: AppColors.gold.withValues(alpha: 0.6)),
                              padding: const EdgeInsets.symmetric(vertical: 8),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}
