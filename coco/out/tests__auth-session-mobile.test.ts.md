# tests/auth-session-mobile.test.ts
lines:212 exports:
---
// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { issueMobileAuthToken, verifyMobileAuthToken } from '@/lib/services/mobile-auth';

// Mock Mobile Storage and Local Database Adapter simulating FlutterSecureStorage & sqflite
interface QueuedAnswer {
  questionId: string;
  answerIndex: number;
  timestamp: number;
  accountId: string;
}

class MobileClientStorageMock {
  // Simulates FlutterSecureStorage
  private secureStorage = new Map<string, string>();
  // Simulates SQLite sqflite database ('quiz_app.db')
  private sqliteAnswerQueue: QueuedAnswer[] = [];
  public sessionExpired = false;

  async saveSession(token: string, accountId: string) {
    const prevAccountId = this.secureStorage.get('account_id');
    // Account switch check (SPEC-flutter-mobile.md lines 40-44 & Survey 2 line 59)
    if (prevAccountId && prevAccountId !== accountId) {
      this.clearAllQueuedAnswers();
    }
    this.secureStorage.set('jwt_token', token);
    this.secureStorage.set('account_id', accountId);
    this.sessionExpired = false;
  }

  async getToken(): Promise<string | null> {
    return this.secureStorage.get('jwt_token') || null;
  }

  async getAccountId(): Promise<string | null> {
    return this.secureStorage.get('account_id') || null;
  }

  async handle401Unauthorized() {
    // 401 invalidates token, flags sessionExpired, but retains sqliteAnswerQueue
