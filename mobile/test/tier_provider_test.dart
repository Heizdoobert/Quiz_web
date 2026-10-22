import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/services/tier/tier_provider.dart';

void main() {
  group('TierCapabilities Quotas & Permissions', () {
    test('Guest tier has 20 quiz limit, cannot create custom topic, and does not persist/sync', () {
      final guest = TierCapabilities.fromTier(UserTier.guest);

      expect(guest.tier, equals(UserTier.guest));
      expect(guest.maxQuizzesPerList, equals(20));
      expect(guest.canCreateCustomTopic, isFalse);
      expect(guest.persistsToDisk, isFalse);
      expect(guest.canSyncWithServer, isFalse);
      expect(guest.canCreateChallengeGroup, isFalse);
      expect(guest.isGuest, isTrue);
      expect(guest.isPro, isFalse);
    });

    test('Authenticated Free tier has 100 quiz limit, allows custom topics, disk save & sync', () {
      final free = TierCapabilities.fromTier(UserTier.free);

      expect(free.tier, equals(UserTier.free));
      expect(free.maxQuizzesPerList, equals(100));
      expect(free.canCreateCustomTopic, isTrue);
      expect(free.persistsToDisk, isTrue);
      expect(free.canSyncWithServer, isTrue);
      expect(free.canCreateChallengeGroup, isFalse);
      expect(free.isGuest, isFalse);
      expect(free.isPro, isFalse);
    });

    test('Pro tier has full limit (unlimited) and unlocks challenge groups', () {
      final pro = TierCapabilities.fromTier(UserTier.pro);

      expect(pro.tier, equals(UserTier.pro));
      expect(pro.maxQuizzesPerList, greaterThanOrEqualTo(999999));
      expect(pro.canCreateCustomTopic, isTrue);
      expect(pro.persistsToDisk, isTrue);
      expect(pro.canSyncWithServer, isTrue);
      expect(pro.canCreateChallengeGroup, isTrue);
      expect(pro.isGuest, isFalse);
      expect(pro.isPro, isTrue);
    });
  });

  group('TierNotifier state transitions', () {
    test('transitions correctly from guest to authenticated and to pro', () {
      final notifier = TierNotifier(isAuth: false);
      expect(notifier.state.tier, equals(UserTier.guest));

      notifier.updateAuth(true);
      expect(notifier.state.tier, equals(UserTier.free));
      expect(notifier.state.maxQuizzesPerList, equals(100));

      notifier.upgradeToPro();
      expect(notifier.state.tier, equals(UserTier.pro));
      expect(notifier.state.canCreateChallengeGroup, isTrue);

      notifier.downgradeToFree();
      expect(notifier.state.tier, equals(UserTier.free));
    });
  });
}
