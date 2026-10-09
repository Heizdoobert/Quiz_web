import 'dart:convert';
import 'package:sqflite/sqflite.dart';
import 'database_helper.dart';

class QuizRepository {
  final DatabaseHelper _dbHelper = DatabaseHelper();

  // --- Questions ---

  Future<void> cacheQuestions(List<Map<String, dynamic>> questions) async {
    final db = await _dbHelper.database;
    Batch batch = db.batch();
    for (var q in questions) {
      batch.insert(
        'questions',
        {
          'id': q['id'],
          'category': q['category'],
          'prompt': q['prompt'],
          'options': jsonEncode(q['options'] ?? []),
          'created_by': q['created_by'],
          'status': q['status'],
        },
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    }
    await batch.commit(noResult: true);
  }

  Future<List<Map<String, dynamic>>> getCachedQuestions() async {
    final db = await _dbHelper.database;
    final List<Map<String, dynamic>> maps = await db.query('questions');
    
    return List.generate(maps.length, (i) {
      return {
        'id': maps[i]['id'],
        'category': maps[i]['category'],
        'prompt': maps[i]['prompt'],
        'options': jsonDecode(maps[i]['options'] as String),
        'created_by': maps[i]['created_by'],
        'status': maps[i]['status'],
      };
    });
  }
  
  Future<void> clearQuestions() async {
    final db = await _dbHelper.database;
    await db.delete('questions');
  }

  // --- Answer Queue ---

  Future<void> queueAnswer(String questionId, int answerIndex) async {
    final db = await _dbHelper.database;
    await db.insert(
      'answer_queue',
      {
        'questionId': questionId,
        'answerIndex': answerIndex,
        'timestamp': DateTime.now().toIso8601String(),
      },
    );
  }

  Future<List<Map<String, dynamic>>> getQueuedAnswers() async {
    final db = await _dbHelper.database;
    return await db.query('answer_queue');
  }

  Future<void> clearQueuedAnswers(List<int> ids) async {
    if (ids.isEmpty) return;
    final db = await _dbHelper.database;
    await db.delete(
      'answer_queue',
      where: 'id IN (${List.filled(ids.length, '?').join(',')})',
      whereArgs: ids,
    );
  }
  
  Future<void> clearAllQueuedAnswers() async {
    final db = await _dbHelper.database;
    await db.delete('answer_queue');
  }
}
