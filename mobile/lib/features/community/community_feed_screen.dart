import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme/app_theme.dart';
import '../../widgets/glass_card.dart';
import '../quiz/quiz_screen.dart';
import '../quiz/create_quiz_screen.dart';

class CommunityQuizItem {
  final String id;
  final String title;
  final String creatorName;
  final String topic;
  final int questionCount;
  final List<Map<String, dynamic>> questions;
  final DateTime createdAt;

  const CommunityQuizItem({
    required this.id,
    required this.title,
    required this.creatorName,
    required this.topic,
    required this.questionCount,
    required this.questions,
    required this.createdAt,
  });
}

final communityQuizzesProvider = FutureProvider<List<CommunityQuizItem>>((ref) async {
  return [
    CommunityQuizItem(
      id: 'comm_1',
      title: 'Ethereum Layer 2 & Rollups Deep Dive',
      creatorName: 'AlexCrypto',
      topic: 'Web3',
      questionCount: 15,
      createdAt: DateTime.now().subtract(const Duration(hours: 3)),
      questions: [
        {
          'id': 'l2_1',
          'prompt': 'Which of the following is an Optimistic Rollup?',
          'category': 'Web3',
          'options': ['Arbitrum', 'Polygon zkEVM', 'Starknet', 'zkSync Era'],
        },
        {
          'id': 'l2_2',
          'prompt': 'What proof system do ZK rollups primarily use?',
          'category': 'Web3',
          'options': ['Fraud Proofs', 'Validity Proofs', 'Proof of Work', 'Proof of Stake'],
        },
      ],
    ),
    CommunityQuizItem(
      id: 'comm_2',
      title: 'DeFi Lending & Liquidity Pools',
      creatorName: 'SarahDeFi',
      topic: 'DeFi',
      questionCount: 20,
      createdAt: DateTime.now().subtract(const Duration(hours: 12)),
      questions: [
        {
          'id': 'defi_1',
          'prompt': 'What is Impermanent Loss in Automated Market Makers?',
          'category': 'DeFi',
          'options': [
            'Loss from asset price divergence vs holding',
            'Slippage during execution',
            'Gas fee volatility',
            'Smart contract rug pull'
          ],
        },
      ],
    ),
    CommunityQuizItem(
      id: 'comm_3',
      title: 'Solana High Speed Consensus',
      creatorName: 'DegenSol',
      topic: 'Crypto',
      questionCount: 10,
      createdAt: DateTime.now().subtract(const Duration(days: 1)),
      questions: [
        {
          'id': 'sol_1',
          'prompt': 'What novel cryptographic clock is used in Solana?',
          'category': 'Crypto',
          'options': ['Proof of History (PoH)', 'Proof of Space', 'Proof of Elapsed Time', 'Proof of Burn'],
        },
      ],
    ),
  ];
});

class CommunityFeedScreen extends ConsumerStatefulWidget {
  const CommunityFeedScreen({super.key});

  @override
  ConsumerState<CommunityFeedScreen> createState() => _CommunityFeedScreenState();
}

class _CommunityFeedScreenState extends ConsumerState<CommunityFeedScreen> {
  String _selectedTopic = 'All';

  @override
  Widget build(BuildContext context) {
    final communityAsync = ref.watch(communityQuizzesProvider);

    return Scaffold(
      backgroundColor: AppColors.deepSpace,
      appBar: AppBar(
        title: const Text('Community Quizzes'),
        backgroundColor: Colors.transparent,
        actions: [
          IconButton(
            icon: const Icon(Icons.add_rounded, color: AppColors.neoMint),
            tooltip: 'Create Quiz for Friends',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const CreateQuizScreen()),
              );
            },
          ),
        ],
      ),
      body: SafeArea(
        child: communityAsync.when(
          loading: () => const Center(child: CircularProgressIndicator(color: AppColors.neoMint)),
          error: (err, _) => Center(
            child: Text('Could not load community quizzes: $err', style: const TextStyle(color: AppColors.popCoral)),
          ),
          data: (quizzes) {
            final topics = ['All', ...{for (final q in quizzes) q.topic}];
            final filtered = _selectedTopic == 'All'
                ? quizzes
                : quizzes.where((q) => q.topic == _selectedTopic).toList();

            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Topic chips
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Row(
                    children: topics.map((t) {
                      final isSelected = _selectedTopic == t;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: FilterChip(
                          label: Text(t),
                          selected: isSelected,
                          selectedColor: AppColors.neoMint,
                          backgroundColor: AppColors.cyberViolet,
                          labelStyle: TextStyle(
                            color: isSelected ? AppColors.deepSpace : AppColors.foreground,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                          ),
                          onSelected: (_) => setState(() => _selectedTopic = t),
                        ),
                      );
                    }).toList(),
                  ),
                ),
                const SizedBox(height: 8),

                // Quizzes List
                Expanded(
                  child: filtered.isEmpty
                      ? const Center(
                          child: Text('No quizzes found for this topic.', style: TextStyle(color: AppColors.slate400)),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: filtered.length,
                          itemBuilder: (context, index) {
                            final item = filtered[index];
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: GlassCard(
                                padding: const EdgeInsets.all(16),
                                radius: 16,
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: AppColors.forCategory(item.topic).withValues(alpha: 0.15),
                                            borderRadius: BorderRadius.circular(8),
                                            border: Border.all(color: AppColors.forCategory(item.topic).withValues(alpha: 0.4)),
                                          ),
                                          child: Text(
                                            item.topic,
                                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.forCategory(item.topic)),
                                          ),
                                        ),
                                        Row(
                                          children: [
                                            const Icon(Icons.help_outline_rounded, size: 14, color: AppColors.slate400),
                                            const SizedBox(width: 4),
                                            Text(
                                              '${item.questionCount} Questions',
                                              style: const TextStyle(fontSize: 12, color: AppColors.slate400),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 10),
                                    Text(
                                      item.title,
                                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.foreground),
                                    ),
                                    const SizedBox(height: 6),
                                    Row(
                                      children: [
                                        const Icon(Icons.person_outline_rounded, size: 14, color: AppColors.slate400),
                                        const SizedBox(width: 4),
                                        Text('By ${item.creatorName}', style: const TextStyle(fontSize: 12, color: AppColors.slate400)),
                                      ],
                                    ),
                                    const SizedBox(height: 14),
                                    SizedBox(
                                      width: double.infinity,
                                      child: ElevatedButton.icon(
                                        onPressed: () {
                                          Navigator.of(context).push(
                                            MaterialPageRoute(builder: (_) => const QuizScreen()),
                                          );
                                        },
                                        icon: const Icon(Icons.play_arrow_rounded),
                                        label: const Text('Play Friend Quiz'),
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: AppColors.neoMint,
                                          foregroundColor: AppColors.deepSpace,
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                          textStyle: const TextStyle(fontWeight: FontWeight.bold),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}
