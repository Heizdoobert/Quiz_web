import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/theme/app_theme.dart';
import '../quiz/quiz_screen.dart';
import '../quiz/create_quiz_screen.dart';
import '../community/community_feed_screen.dart';
import '../leaderboard/leaderboard_screen.dart';
import '../profile/profile_screen.dart';
import '../settings/settings_screen.dart';

class MainScreen extends ConsumerStatefulWidget {
  const MainScreen({
    super.key,
    this.initialIndex = 0,
  });

  final int initialIndex;

  @override
  ConsumerState<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends ConsumerState<MainScreen> {
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
  }

  @override
  Widget build(BuildContext context) {
    final screens = const [
      QuizScreen(key: PageStorageKey('quiz')),
      CommunityFeedScreen(key: PageStorageKey('community')),
      LeaderboardScreen(key: PageStorageKey('leaderboard')),
      ProfileScreen(key: PageStorageKey('profile')),
      SettingsScreen(key: PageStorageKey('settings')),
    ];
    // Define navigation destinations once for performance & accessibility
    const _navDestinations = [
      NavigationDestination(
        icon: Icon(Icons.quiz_outlined, semanticLabel: 'Quiz'),
        selectedIcon: Icon(Icons.quiz_rounded, color: AppColors.neoMint, semanticLabel: 'Quiz selected'),
        label: 'Quiz',
      ),
      NavigationDestination(
        icon: Icon(Icons.people_outline_rounded, semanticLabel: 'Community'),
        selectedIcon: Icon(Icons.people_rounded, color: AppColors.neoMint, semanticLabel: 'Community selected'),
        label: 'Community',
      ),
      NavigationDestination(
        icon: Icon(Icons.leaderboard_outlined, semanticLabel: 'Leaderboard'),
        selectedIcon: Icon(Icons.leaderboard_rounded, color: AppColors.neoMint, semanticLabel: 'Leaderboard selected'),
        label: 'Leaderboard',
      ),
      NavigationDestination(
        icon: Icon(Icons.person_outline_rounded, semanticLabel: 'Profile'),
        selectedIcon: Icon(Icons.person_rounded, color: AppColors.neoMint, semanticLabel: 'Profile selected'),
        label: 'Profile',
      ),
      NavigationDestination(
        icon: Icon(Icons.settings_outlined, semanticLabel: 'Settings'),
        selectedIcon: Icon(Icons.settings_rounded, color: AppColors.neoMint, semanticLabel: 'Settings selected'),
        label: 'Settings',
      ),
    ];

    return Scaffold(
      backgroundColor: AppColors.deepSpace,
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      floatingActionButton: (_currentIndex == 0 || _currentIndex == 1)
          ? FloatingActionButton.extended(
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const CreateQuizScreen()),
                );
              },
              backgroundColor: AppColors.neoMint,
              foregroundColor: AppColors.deepSpace,
              icon: const Icon(Icons.add_rounded),
              label: const Text('Create Quiz', style: TextStyle(fontWeight: FontWeight.bold)),
            )
          : null,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
          labelBehavior: NavigationDestinationLabelBehavior.onlyShowSelected,
      ),
    );
  }
}
