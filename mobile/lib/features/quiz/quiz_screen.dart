import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'quiz_provider.dart';

class QuizScreen extends ConsumerStatefulWidget {
  const QuizScreen({super.key});

  @override
  ConsumerState<QuizScreen> createState() => _QuizScreenState();
}

class _QuizScreenState extends ConsumerState<QuizScreen> {
  int _currentIndex = 0;
  bool _isFlipped = false;
  int? _selectedAnswer;
  bool _isCorrect = false;

  void _handleAnswer(int index, Map<String, dynamic> question) {
    if (_selectedAnswer != null) return;
    
    final correctIndex = question['correct_index'] as int?; 
    
    setState(() {
      _selectedAnswer = index;
      // In offline mode we might not have correct_index. Assume true if null for UI demo
      _isCorrect = correctIndex == null ? true : (index == correctIndex);
    });

    ref.read(quizProvider.notifier).submitAnswer(question['id'].toString(), index);

    Future.delayed(const Duration(milliseconds: 600), () {
      if (mounted) {
        setState(() {
          _isFlipped = true;
        });
      }
    });
  }

  void _nextQuestion(int totalQuestions) {
    if (_currentIndex < totalQuestions - 1) {
      setState(() {
        _isFlipped = false;
        _selectedAnswer = null;
        _isCorrect = false;
        _currentIndex++;
      });
    } else {
      ref.read(quizProvider.notifier).loadData();
      setState(() {
        _currentIndex = 0;
        _isFlipped = false;
        _selectedAnswer = null;
        _isCorrect = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final quizState = ref.watch(quizProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF0A1128), // Deep Space
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Row(
          children: [
            const Icon(Icons.bolt, color: Color(0xFF00FFCC)),
            const SizedBox(width: 8),
            const Text(
              'QUICK QUIZ',
              style: TextStyle(
                fontWeight: FontWeight.w900,
                fontSize: 18,
                letterSpacing: 1.0,
                color: Colors.white,
              ),
            ),
          ],
        ),
        actions: [
          if (quizState.pendingSyncCount > 0)
            Container(
              margin: const EdgeInsets.only(right: 16.0, top: 12, bottom: 12),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFFFD166).withOpacity(0.15),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFFFFD166).withOpacity(0.4)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.sync, color: Color(0xFFFFD166), size: 14),
                  const SizedBox(width: 4),
                  Text(
                    '${quizState.pendingSyncCount} Syncing',
                    style: const TextStyle(
                      color: Color(0xFFFFD166),
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
      body: quizState.questions.when(
        loading: () => const Center(child: CircularProgressIndicator(color: Color(0xFF00FFCC))),
        error: (err, stack) => Center(child: Text('Error: $err', style: const TextStyle(color: Colors.redAccent))),
        data: (questions) {
          if (questions.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.rocket_launch, size: 64, color: Color(0xFF00FFCC)),
                  const SizedBox(height: 24),
                  const Text(
                    'No Questions Yet',
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Tap refresh to download new questions.',
                    style: TextStyle(color: Colors.white70),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF6C5CE7),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: () => ref.read(quizProvider.notifier).loadData(),
                    child: const Text('Refresh', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  )
                ],
              ),
            );
          }

          final q = questions[_currentIndex];
          final options = List<String>.from(q['options']);
          final category = (q['category'] ?? 'General').toString().toUpperCase();

          return SafeArea(
            child: Column(
              children: [
                // Category Bar
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFF00FFCC).withOpacity(0.15),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFF00FFCC).withOpacity(0.3)),
                        ),
                        child: Text(
                          category,
                          style: const TextStyle(
                            color: Color(0xFF00FFCC),
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1.0,
                          ),
                        ),
                      ),
                      const Spacer(),
                      Text(
                        '${_currentIndex + 1} / ${questions.length}',
                        style: const TextStyle(
                          color: Colors.white54,
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
                
                // Quiz Card Main Area
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Center(
                      child: AnimatedSwitcher(
                        duration: const Duration(milliseconds: 500),
                        transitionBuilder: (Widget child, Animation<double> animation) {
                          final rotateAnim = Tween(begin: pi, end: 0.0).animate(animation);
                          return AnimatedBuilder(
                            animation: rotateAnim,
                            child: child,
                            builder: (context, widget) {
                              final isUnder = (ValueKey(_isFlipped) != widget?.key);
                              var tilt = ((animation.value - 0.5).abs() - 0.5) * 0.003;
                              tilt *= isUnder ? -1.0 : 1.0;
                              final value = isUnder ? min(rotateAnim.value, pi / 2) : rotateAnim.value;
                              
                              return Transform(
                                transform: Matrix4.rotationY(value)..setEntry(3, 0, tilt),
                                alignment: Alignment.center,
                                child: widget,
                              );
                            },
                          );
                        },
                        child: _isFlipped 
                            ? _buildBackFace(q, questions.length) 
                            : _buildFrontFace(q, options),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildFrontFace(Map<String, dynamic> q, List<String> options) {
    return Container(
      key: const ValueKey(false),
      width: double.infinity,
      decoration: BoxDecoration(
        color: const Color(0xFF131428).withOpacity(0.85),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFF00FFCC).withOpacity(0.2), width: 1),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.4),
            blurRadius: 16,
            offset: const Offset(0, 8),
          )
        ],
      ),
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Powerups / Tools
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF222344),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.timer, color: Color(0xFF00FFCC), size: 14),
                    SizedBox(width: 6),
                    Text('30s', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
              Row(
                children: [
                  _buildPowerUpButton(Icons.auto_fix_high, '50:50', const Color(0xFF00FFCC)),
                  const SizedBox(width: 8),
                  _buildPowerUpButton(Icons.fast_forward, 'Skip', const Color(0xFF6C5CE7)),
                ],
              )
            ],
          ),
          const SizedBox(height: 24),
          
          // Question Text
          Text(
            q['prompt'],
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Colors.white,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 32),
          
          // Options Grid
          ...List.generate(options.length, (index) {
            final isClicked = _selectedAnswer == index;
            final letter = ['A', 'B', 'C', 'D'][index];
            
            return Padding(
              padding: const EdgeInsets.only(bottom: 12.0),
              child: InkWell(
                onTap: () => _handleAnswer(index, q),
                borderRadius: BorderRadius.circular(16),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isClicked ? const Color(0xFF222344) : const Color(0xFF1A1B35),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: isClicked ? const Color(0xFF00FFCC) : const Color(0xFF2D305A),
                      width: isClicked ? 1.5 : 1.0,
                    ),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: isClicked ? const Color(0xFF00FFCC).withOpacity(0.2) : const Color(0xFF1A1B35),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: isClicked ? const Color(0xFF00FFCC) : const Color(0xFF2D305A),
                          ),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          letter,
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: isClicked ? const Color(0xFF00FFCC) : Colors.white70,
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Text(
                          options[index],
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 15,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                      if (isClicked)
                        const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Color(0xFF00FFCC),
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
    );
  }

  Widget _buildBackFace(Map<String, dynamic> q, int totalQuestions) {
    return Container(
      key: const ValueKey(true),
      width: double.infinity,
      decoration: BoxDecoration(
        color: const Color(0xFF131428).withOpacity(0.85),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: _isCorrect ? const Color(0xFF00FFCC).withOpacity(0.4) : const Color(0xFFFF4757).withOpacity(0.4), 
          width: 2
        ),
        boxShadow: [
          BoxShadow(
            color: _isCorrect ? const Color(0xFF00FFCC).withOpacity(0.1) : const Color(0xFFFF4757).withOpacity(0.1),
            blurRadius: 24,
            offset: const Offset(0, 8),
          )
        ],
      ),
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            _isCorrect ? Icons.check_circle : Icons.cancel,
            color: _isCorrect ? const Color(0xFF00FFCC) : const Color(0xFFFF4757),
            size: 64,
          ),
          const SizedBox(height: 16),
          Text(
            _isCorrect ? 'Correct!' : 'Not Quite!',
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: _isCorrect ? const Color(0xFF00FFCC) : const Color(0xFFFF4757),
            ),
          ),
          const SizedBox(height: 16),
          if (!_isCorrect && q['correct_index'] != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 24.0),
              child: Text(
                "Correct Answer: ${q['options'][q['correct_index']]}",
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white70, fontSize: 16),
              ),
            ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF6C5CE7), // Electric Indigo
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: () => _nextQuestion(totalQuestions),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('Next Question', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  SizedBox(width: 8),
                  Icon(Icons.arrow_forward, size: 20),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPowerUpButton(IconData icon, String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFF1A1B35),
        border: Border.all(color: color.withOpacity(0.3)),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 12),
          const SizedBox(width: 4),
          Text(
            label,
            style: const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }
}
