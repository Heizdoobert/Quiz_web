import 'package:flutter_riverpod/legacy.dart';

class ChallengeGroupMember {
  final String name;
  final int score;
  final int rank;
  final bool isChallenger;

  const ChallengeGroupMember({
    required this.name,
    required this.score,
    required this.rank,
    this.isChallenger = false,
  });
}

class ChallengeGroup {
  final String id;
  final String title;
  final String topic;
  final String description;
  final String creator;
  final int memberCount;
  final double rankMultiplier;
  final List<ChallengeGroupMember> leaderboard;

  const ChallengeGroup({
    required this.id,
    required this.title,
    required this.topic,
    required this.description,
    required this.creator,
    required this.memberCount,
    this.rankMultiplier = 1.5,
    required this.leaderboard,
  });
}

class ChallengeGroupNotifier extends StateNotifier<List<ChallengeGroup>> {
  ChallengeGroupNotifier() : super(_defaultGroups);

  static final List<ChallengeGroup> _defaultGroups = [
    const ChallengeGroup(
      id: 'grp-1',
      title: 'Top 1% Flutter Architects',
      topic: 'Flutter & Dart',
      description: 'Challenger battleground for senior Flutter devs. Double XP ranking.',
      creator: 'Alex Pro',
      memberCount: 42,
      rankMultiplier: 2.0,
      leaderboard: [
        ChallengeGroupMember(name: 'Alex Pro', score: 3420, rank: 1, isChallenger: true),
        ChallengeGroupMember(name: 'DartMaster', score: 2980, rank: 2, isChallenger: true),
        ChallengeGroupMember(name: 'NeoWidget', score: 2150, rank: 3, isChallenger: false),
      ],
    ),
    const ChallengeGroup(
      id: 'grp-2',
      title: 'Web3 & DeFi Speedrunners',
      topic: 'Web3',
      description: 'Smart contracts, consensus mechanisms & speed quizzes.',
      creator: 'Satoshi99',
      memberCount: 28,
      rankMultiplier: 1.5,
      leaderboard: [
        ChallengeGroupMember(name: 'Satoshi99', score: 2800, rank: 1, isChallenger: true),
        ChallengeGroupMember(name: 'CryptoWhale', score: 2450, rank: 2, isChallenger: false),
        ChallengeGroupMember(name: 'SolidityDev', score: 1990, rank: 3, isChallenger: false),
      ],
    ),
    const ChallengeGroup(
      id: 'grp-3',
      title: 'System Design Arena',
      topic: 'Tech',
      description: 'Distributed systems, caching, scaling & high availability tests.',
      creator: 'ArchitectX',
      memberCount: 65,
      rankMultiplier: 1.8,
      leaderboard: [
        ChallengeGroupMember(name: 'ArchitectX', score: 4120, rank: 1, isChallenger: true),
        ChallengeGroupMember(name: 'CloudGuru', score: 3870, rank: 2, isChallenger: true),
        ChallengeGroupMember(name: 'ScaleMaster', score: 3200, rank: 3, isChallenger: false),
      ],
    ),
  ];

  void addGroup(ChallengeGroup group) {
    state = [group, ...state];
  }
}

final challengeGroupProvider =
    StateNotifierProvider<ChallengeGroupNotifier, List<ChallengeGroup>>((ref) {
  return ChallengeGroupNotifier();
});
