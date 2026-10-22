import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../theme/app_theme.dart';
import '../services/tier/tier_provider.dart';

Future<void> showUpgradeProModal(BuildContext context, WidgetRef ref) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppColors.cyberViolet,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      side: BorderSide(color: AppColors.cyberBorder),
    ),
    builder: (modalCtx) {
      final tier = ref.watch(tierProvider);
      return Padding(
        padding: const EdgeInsets.fromLTRB(24, 20, 24, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.slate400.withValues(alpha: 0.4),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            const Row(
              children: [
                Icon(Icons.workspace_premium_rounded, color: AppColors.gold, size: 28),
                SizedBox(width: 10),
                Text(
                  'Unlock Pro Package',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: AppColors.foreground,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            const Text(
              'Unlock 100% full limit, host private Challenge Groups for your friends, and boost your rankings across the leaderboard.',
              style: TextStyle(fontSize: 14, color: AppColors.slate300, height: 1.4),
            ),
            const SizedBox(height: 20),
            const _FeatureRow(
              icon: Icons.all_inclusive_rounded,
              title: 'Full Limit: Unlimited Quizzes',
              subtitle: 'No 20 or 100 quiz caps',
            ),
            const _FeatureRow(
              icon: Icons.groups_rounded,
              title: 'Open Challenge Groups',
              subtitle: 'Create group battles & dedicated leaderboards',
            ),
            const _FeatureRow(
              icon: Icons.leaderboard_rounded,
              title: 'Challenger Rank Boost',
              subtitle: 'Cross top rankings easier with Challenger status',
            ),
            const SizedBox(height: 24),
            if (tier.isPro)
              ElevatedButton.icon(
                onPressed: () => Navigator.of(modalCtx).pop(),
                icon: const Icon(Icons.check_circle_rounded, color: AppColors.deepSpace),
                label: const Text('Pro Package Already Active'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.gold,
                  foregroundColor: AppColors.deepSpace,
                  minimumSize: const Size.fromHeight(50),
                  textStyle: const TextStyle(fontWeight: FontWeight.bold),
                ),
              )
            else
              ElevatedButton.icon(
                onPressed: () {
                  ref.read(tierProvider.notifier).upgradeToPro();
                  Navigator.of(modalCtx).pop();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Pro Package Activated! Full limits and Challenge Groups unlocked.'),
                      backgroundColor: AppColors.elevation2,
                    ),
                  );
                },
                icon: const Icon(Icons.bolt_rounded, color: AppColors.deepSpace),
                label: const Text('Unlock Pro Package (Full Limit)'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.neoMint,
                  foregroundColor: AppColors.deepSpace,
                  minimumSize: const Size.fromHeight(50),
                  textStyle: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
          ],
        ),
      );
    },
  );
}

class _FeatureRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;

  const _FeatureRow({required this.icon, required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: AppColors.cyberVioletLight,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: AppColors.neoMint, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.foreground, fontSize: 14)),
                const SizedBox(height: 2),
                Text(subtitle, style: const TextStyle(color: AppColors.slate400, fontSize: 12)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
