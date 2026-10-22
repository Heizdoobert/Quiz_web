import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:quickquiz_sdk/quickquiz_sdk.dart';
import '../theme/app_theme.dart';
import '../services/tier/tier_provider.dart';
import '../services/transactions/package_transaction_manager.dart';

Future<void> showUpgradeProModal(BuildContext context, WidgetRef ref) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppColors.cyberViolet,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      side: BorderSide(color: AppColors.cyberBorder),
    ),
    builder: (modalCtx) => const _UpgradeProModalContent(),
  );
}

class _UpgradeProModalContent extends ConsumerStatefulWidget {
  const _UpgradeProModalContent();

  @override
  ConsumerState<_UpgradeProModalContent> createState() => _UpgradeProModalContentState();
}

class _UpgradeProModalContentState extends ConsumerState<_UpgradeProModalContent> {
  String _selectedPackageId = 'pro_annual';

  Future<void> _handlePurchase(UpgradePackage selectedPkg) async {
    try {
      final txn = await ref
          .read(packageTransactionManagerProvider.notifier)
          .purchasePackage(selectedPkg.id);

      if (!mounted) return;

      if (txn.status == 'verified') {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Upgraded to ${selectedPkg.name}! Pro limits unlocked.'),
            backgroundColor: AppColors.elevation2,
          ),
        );
      }
    } catch (_) {}
  }

  Future<void> _handleRestore() async {
    final restored = await ref
        .read(packageTransactionManagerProvider.notifier)
        .restorePurchases();

    if (!mounted) return;

    if (restored.any((t) => t.status == 'verified')) {
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Purchases restored successfully! Pro unlocked.'),
          backgroundColor: AppColors.elevation2,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No previous active purchases found.'),
          backgroundColor: AppColors.cyberViolet,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final tier = ref.watch(tierProvider);
    final txnState = ref.watch(packageTransactionManagerProvider);
    final packages = ref.watch(packageTransactionManagerProvider.notifier).getPackages();

    final selectedPkg = packages.firstWhere(
      (p) => p.id == _selectedPackageId,
      orElse: () => packages.first,
    );

    return SafeArea(
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.9,
        ),
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const _ModalHandle(),
              const SizedBox(height: 16),
              const _ModalHeader(),
              const SizedBox(height: 16),
              const _FeaturesOverview(),
              const SizedBox(height: 16),
              const Text(
                'Choose Your Plan',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.foreground),
              ),
              const SizedBox(height: 10),
              ...packages.map((pkg) => _PackageCard(
                    pkg: pkg,
                    isSelected: pkg.id == _selectedPackageId,
                    onTap: () => setState(() => _selectedPackageId = pkg.id),
                  )),
              if (txnState.errorMessage != null) ...[
                const SizedBox(height: 8),
                _ErrorMessageBanner(message: txnState.errorMessage!),
              ],
              const SizedBox(height: 16),
              _UpgradeActionButton(
                isPro: tier.isPro,
                isLoading: txnState.isLoading,
                selectedPkg: selectedPkg,
                onPurchase: () => _handlePurchase(selectedPkg),
              ),
              const SizedBox(height: 8),
              _RestorePurchasesButton(
                isLoading: txnState.isLoading,
                onRestore: _handleRestore,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ModalHandle extends StatelessWidget {
  const _ModalHandle();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        width: 40,
        height: 4,
        decoration: BoxDecoration(
          color: AppColors.slate400.withValues(alpha: 0.4),
          borderRadius: BorderRadius.circular(2),
        ),
      ),
    );
  }
}

class _ModalHeader extends StatelessWidget {
  const _ModalHeader();

  @override
  Widget build(BuildContext context) {
    return const Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(Icons.workspace_premium_rounded, color: AppColors.gold, size: 28),
            SizedBox(width: 10),
            Text(
              'Unlock Pro Package',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.foreground),
            ),
          ],
        ),
        SizedBox(height: 8),
        Text(
          'Unlock full limits, host private Challenge Groups with custom leaderboards, and cross top rankings easier.',
          style: TextStyle(fontSize: 13, color: AppColors.slate300, height: 1.4),
        ),
      ],
    );
  }
}

class _FeaturesOverview extends StatelessWidget {
  const _FeaturesOverview();

  @override
  Widget build(BuildContext context) {
    return const Column(
      children: [
        _FeatureRow(
          icon: Icons.all_inclusive_rounded,
          title: 'Full Limit: Unlimited Quizzes',
          subtitle: 'No 20 or 100 quiz session caps',
        ),
        _FeatureRow(
          icon: Icons.groups_rounded,
          title: 'Open Challenge Groups',
          subtitle: 'Dedicated leaderboards & friend arenas',
        ),
        _FeatureRow(
          icon: Icons.leaderboard_rounded,
          title: 'Challenger Rank Multipliers',
          subtitle: 'Boost points and climb the top leaderboards',
        ),
      ],
    );
  }
}

class _PackageCard extends StatelessWidget {
  final UpgradePackage pkg;
  final bool isSelected;
  final VoidCallback onTap;

  const _PackageCard({
    required this.pkg,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        key: Key('package_card_${pkg.id}'),
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.gold.withValues(alpha: 0.12) : AppColors.cyberVioletLight,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: isSelected ? AppColors.gold : AppColors.cyberBorder,
              width: isSelected ? 2 : 1,
            ),
          ),
          child: Row(
            children: [
              Icon(
                isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
                color: isSelected ? AppColors.gold : AppColors.slate400,
                size: 20,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          pkg.name,
                          style: const TextStyle(
                            color: AppColors.foreground,
                            fontWeight: FontWeight.bold,
                            fontSize: 15,
                          ),
                        ),
                        if (pkg.badge != null) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.gold.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(4),
                              border: Border.all(color: AppColors.gold.withValues(alpha: 0.4)),
                            ),
                            child: Text(
                              pkg.badge!,
                              style: const TextStyle(
                                color: AppColors.gold,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      pkg.description,
                      style: const TextStyle(color: AppColors.slate400, fontSize: 11),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '\$${pkg.price.toStringAsFixed(2)}',
                    style: const TextStyle(
                      color: AppColors.neoMint,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                  Text(
                    pkg.interval == 'lifetime' ? 'once' : '/ ${pkg.interval}',
                    style: const TextStyle(color: AppColors.slate400, fontSize: 11),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ErrorMessageBanner extends StatelessWidget {
  final String message;

  const _ErrorMessageBanner({required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AppColors.popCoral.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.popCoral.withValues(alpha: 0.5)),
      ),
      child: Text(
        message,
        style: const TextStyle(color: AppColors.popCoral, fontSize: 12),
        textAlign: TextAlign.center,
      ),
    );
  }
}

class _UpgradeActionButton extends StatelessWidget {
  final bool isPro;
  final bool isLoading;
  final UpgradePackage selectedPkg;
  final VoidCallback onPurchase;

  const _UpgradeActionButton({
    required this.isPro,
    required this.isLoading,
    required this.selectedPkg,
    required this.onPurchase,
  });

  @override
  Widget build(BuildContext context) {
    if (isPro) {
      return ElevatedButton.icon(
        onPressed: () => Navigator.of(context).pop(),
        icon: const Icon(Icons.check_circle_rounded, color: AppColors.deepSpace),
        label: const Text('Pro Package Already Active'),
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.gold,
          foregroundColor: AppColors.deepSpace,
          minimumSize: const Size.fromHeight(50),
          textStyle: const TextStyle(fontWeight: FontWeight.bold),
        ),
      );
    }

    return ElevatedButton.icon(
      key: const Key('purchase_package_button'),
      onPressed: isLoading ? null : onPurchase,
      icon: isLoading
          ? const SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.deepSpace),
            )
          : const Icon(Icons.bolt_rounded, color: AppColors.deepSpace),
      label: Text(
        isLoading
            ? 'Processing Upgrade...'
            : 'Upgrade to ${selectedPkg.name} (\$${selectedPkg.price.toStringAsFixed(2)})',
      ),
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.neoMint,
        foregroundColor: AppColors.deepSpace,
        minimumSize: const Size.fromHeight(50),
        textStyle: const TextStyle(fontWeight: FontWeight.bold),
      ),
    );
  }
}

class _RestorePurchasesButton extends StatelessWidget {
  final bool isLoading;
  final VoidCallback onRestore;

  const _RestorePurchasesButton({
    required this.isLoading,
    required this.onRestore,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: TextButton(
        onPressed: isLoading ? null : onRestore,
        child: const Text(
          'Restore Purchases',
          style: TextStyle(
            color: AppColors.slate400,
            fontSize: 12,
            decoration: TextDecoration.underline,
          ),
        ),
      ),
    );
  }
}

class _FeatureRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;

  const _FeatureRow({required this.icon, required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(5),
            decoration: BoxDecoration(
              color: AppColors.cyberVioletLight,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: AppColors.neoMint, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.foreground, fontSize: 13)),
                const SizedBox(height: 1),
                Text(subtitle, style: const TextStyle(color: AppColors.slate400, fontSize: 11)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
