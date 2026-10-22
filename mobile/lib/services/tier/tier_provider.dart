import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';
import '../../features/auth/auth_provider.dart';

enum UserTier {
  guest,
  free,
  pro,
}

class TierCapabilities {
  final UserTier tier;
  final int maxQuizzesPerList;
  final bool canCreateCustomTopic;
  final bool persistsToDisk;
  final bool canSyncWithServer;
  final bool canPublishToCommunity;
  final bool canCreateChallengeGroup;
  final String label;
  final String quotaDescription;

  const TierCapabilities({
    required this.tier,
    required this.maxQuizzesPerList,
    required this.canCreateCustomTopic,
    required this.persistsToDisk,
    required this.canSyncWithServer,
    required this.canPublishToCommunity,
    required this.canCreateChallengeGroup,
    required this.label,
    required this.quotaDescription,
  });

  factory TierCapabilities.fromTier(UserTier tier) {
    switch (tier) {
      case UserTier.guest:
        return const TierCapabilities(
          tier: UserTier.guest,
          maxQuizzesPerList: 20,
          canCreateCustomTopic: false,
          persistsToDisk: false,
          canSyncWithServer: false,
          canPublishToCommunity: false,
          canCreateChallengeGroup: false,
          label: 'Guest Session',
          quotaDescription: 'Limit 20 quizzes per session (In-Memory Only, No Save/Sync)',
        );
      case UserTier.free:
        return const TierCapabilities(
          tier: UserTier.free,
          maxQuizzesPerList: 100,
          canCreateCustomTopic: true,
          persistsToDisk: true,
          canSyncWithServer: true,
          canPublishToCommunity: true,
          canCreateChallengeGroup: false,
          label: 'Authenticated (80% Tier)',
          quotaDescription: 'Limit 100 quizzes per list (Local Save, Cloud Sync, Friends Can Join)',
        );
      case UserTier.pro:
        return const TierCapabilities(
          tier: UserTier.pro,
          maxQuizzesPerList: 999999,
          canCreateCustomTopic: true,
          persistsToDisk: true,
          canSyncWithServer: true,
          canPublishToCommunity: true,
          canCreateChallengeGroup: true,
          label: 'Pro Package (Full Limit)',
          quotaDescription: 'Full Limit (Unlimited Quizzes, Challenge Groups, Leaderboard Boost)',
        );
    }
  }

  bool get isPro => tier == UserTier.pro;
  bool get isGuest => tier == UserTier.guest;
  bool get isAuthenticated => tier != UserTier.guest;
}

class TierNotifier extends StateNotifier<TierCapabilities> {
  bool _proUnlocked = false;

  TierNotifier({bool isAuth = false, bool isPro = false})
      : _proUnlocked = isPro,
        super(TierCapabilities.fromTier(_computeTier(isAuth, isPro)));

  static UserTier _computeTier(bool isAuth, bool isPro) {
    if (!isAuth) return UserTier.guest;
    if (isPro) return UserTier.pro;
    return UserTier.free;
  }

  void updateAuth(bool isAuth) {
    state = TierCapabilities.fromTier(_computeTier(isAuth, _proUnlocked));
  }

  void upgradeToPro() {
    _proUnlocked = true;
    state = TierCapabilities.fromTier(UserTier.pro);
  }

  void downgradeToFree() {
    _proUnlocked = false;
    state = TierCapabilities.fromTier(UserTier.free);
  }
}

final tierProvider = StateNotifierProvider<TierNotifier, TierCapabilities>((ref) {
  final authState = ref.watch(authProvider);
  final notifier = TierNotifier(isAuth: authState.isAuthenticated);
  ref.listen(authProvider.select((a) => a.isAuthenticated), (_, isAuth) {
    notifier.updateAuth(isAuth);
  });
  return notifier;
});
