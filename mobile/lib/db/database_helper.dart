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
      version: 3,
      onCreate: _onCreate,
      onUpgrade: _onUpgrade,
    );
  }

  // Handles schema migrations
  Future<void> _onUpgrade(Database db, int oldVersion, int newVersion) async {
    if (oldVersion < 2) {
      // Add client_uuid column to answer_queue for idempotent sync
      await db.execute('ALTER TABLE answer_queue ADD COLUMN client_uuid TEXT;');
    }
    if (oldVersion < 3) {
      await db.execute('''
        CREATE TABLE IF NOT EXISTS saved_quizzes (
          id TEXT PRIMARY KEY,
          name TEXT,
          questions TEXT,
          saved_at TEXT
        )
      ''');
    }
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
        timestamp TEXT,
        client_uuid TEXT
      )
    ''');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS saved_quizzes (
        id TEXT PRIMARY KEY,
        name TEXT,
        questions TEXT,
        saved_at TEXT
      )
    ''');
  }
}
