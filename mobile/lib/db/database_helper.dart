import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

class DatabaseHelper {
  static final DatabaseHelper _instance = DatabaseHelper._internal();
  static Database? _database;

  factory DatabaseHelper() {
    return _instance;
  }

  DatabaseHelper._internal();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDatabase();
    return _database!;
  }

  Future<Database> _initDatabase() async {
    String path = join(await getDatabasesPath(), 'quiz_app.db');
    return await openDatabase(
      path,
      version: 1,
      onCreate: _onCreate,
    );
  }

  Future<void> _onCreate(Database db, int version) async {
    await db.execute('''
      CREATE TABLE questions (
        id TEXT PRIMARY KEY,
        category TEXT,
        prompt TEXT,
        options TEXT,
        created_by TEXT,
        status TEXT
      )
    ''');

    await db.execute('''
      CREATE TABLE answer_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        questionId TEXT,
        answerIndex INTEGER,
        timestamp TEXT
      )
    ''');
  }
}
