import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/theme/app_theme.dart';
import 'package:mobile/widgets/glass_card.dart';
import 'package:mobile/widgets/legal_links.dart';
import '../auth/auth_provider.dart';
import '../auth/auth_screen.dart' show requireSignIn;
import '../../db/quiz_repository.dart';
import '../../services/sync/sync_service.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  int _pendingSyncCount = 0;
  bool _isSyncing = false;

  @override
  void initState() {
    super.initState();
    _loadPendingCount();
  }

  Future<void> _loadPendingCount() async {
    try {
      final queued = await ref.read(quizRepositoryProvider).getQueuedAnswers();
      if (mounted) {
        setState(() {
          _pendingSyncCount = queued.length;
        });
      }
    } catch (_) {}
  }

  Future<void> _handleSync() async {
    setState(() => _isSyncing = true);
    try {
      await ref.read(syncServiceProvider).syncAnswers();
      await _loadPendingCount();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Sync completed!')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Sync failed: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSyncing = false);
    }
  }

  Future<void> _handleLogout() async {
    await ref.read(authProvider.notifier).logout();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Signed out successfully.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    return Scaffold(
      backgroundColor: AppColors.deepSpace,
      appBar: AppBar(
        title: const Text('Settings'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          children: [
            // Account Section
            const Text(
              'Account',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: AppColors.neoMint,
              ),
            ),
            const SizedBox(height: 8),
            GlassCard(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          backgroundColor: AppColors.cyberVioletLight,
                          child: const Icon(Icons.person_rounded, color: AppColors.foreground),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                authState.isAuthenticated ? 'Logged In Player' : 'Guest Player',
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.foreground,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                authState.isAuthenticated
                                    ? 'Your answers and stats sync to the server'
                                    : 'Sign in to record your scores and streaks',
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: AppColors.slate400,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: authState.isAuthenticated
                          ? OutlinedButton.icon(
                              onPressed: _handleLogout,
                              icon: const Icon(Icons.logout_rounded, color: AppColors.popCoral),
                              label: const Text(
                                'Sign Out',
                                style: TextStyle(color: AppColors.popCoral, fontWeight: FontWeight.bold),
                              ),
                              style: OutlinedButton.styleFrom(
                                side: const BorderSide(color: AppColors.popCoral),
                                padding: const EdgeInsets.symmetric(vertical: 12),
                              ),
                            )
                          : ElevatedButton.icon(
                              onPressed: () => requireSignIn(context, ref),
                              icon: const Icon(Icons.login_rounded),
                              label: const Text(
                                'Sign In / Register',
                                style: TextStyle(fontWeight: FontWeight.bold),
                              ),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.neoMint,
                                foregroundColor: AppColors.deepSpace,
                                padding: const EdgeInsets.symmetric(vertical: 12),
                              ),
                            ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Offline Sync Section
            const Text(
              'Data & Offline Storage',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: AppColors.neoMint,
              ),
            ),
            const SizedBox(height: 8),
            GlassCard(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Pending Sync Answers:',
                          style: TextStyle(color: AppColors.slate300, fontSize: 14),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: _pendingSyncCount > 0 ? AppColors.popCoral : AppColors.cyberVioletLight,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            '$_pendingSyncCount',
                            style: const TextStyle(
                              color: AppColors.foreground,
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: _isSyncing ? null : _handleSync,
                        icon: _isSyncing
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.deepSpace),
                              )
                            : const Icon(Icons.sync_rounded),
                        label: Text(_isSyncing ? 'Syncing...' : 'Sync Now'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.neoMint,
                          foregroundColor: AppColors.deepSpace,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // About & Legal
            const Text(
              'About',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: AppColors.neoMint,
              ),
            ),
            const SizedBox(height: 8),
            GlassCard(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('App Version', style: TextStyle(color: AppColors.slate300)),
                        Text('v1.0.0', style: TextStyle(color: AppColors.slate400, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const Divider(color: AppColors.cyberBorder, height: 24),
                    const LegalLinks(),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
