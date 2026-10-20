/**
 * Storage Service
 * Handles persistence in localStorage and provides atomic access for CampusFind service layer.
 * Prepares the application for zero-friction Firebase Firestore swap.
 */

import {
  User,
  ItemReport,
  MatchSuggestion,
  Notification,
  AdminAction,
  SignupAttempt,
  SimulatedEmail,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_REPORTS,
  INITIAL_MATCH_SUGGESTIONS,
  INITIAL_NOTIFICATIONS,
  INITIAL_ADMIN_ACTIONS,
  DEMO_PASSWORD_HASH,
  hashPassword,
} from './seedData';
import { INACTIVITY_ARCHIVE_DAYS } from '../config/matchingConfig';
import { firestoreSync } from './firestoreSync';

export { hashPassword };

const STORAGE_KEYS = {
  USERS: 'campusfind_users',
  REPORTS: 'campusfind_reports',
  MATCHES: 'campusfind_matches',
  NOTIFICATIONS: 'campusfind_notifications',
  ADMIN_ACTIONS: 'campusfind_admin_actions',
  SIGNUP_ATTEMPTS: 'campusfind_signup_attempts',
  PASSWORDS: 'campusfind_passwords',
  SIMULATED_EMAILS: 'campusfind_simulated_emails',
  CURRENT_USER: 'campusfind_current_user',
};

// Safe localStorage writer with quota error handling
function safeSetItem(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch (e: any) {
    if (
      e?.name === 'QuotaExceededError' ||
      e?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      e?.code === 22 ||
      e?.code === 1014 ||
      e?.message?.toLowerCase().includes('quota')
    ) {
      throw new Error('Storage is full - remove the photo and try again');
    }
    throw e;
  }
}

class AppStorage {
  private initialized = false;

  constructor() {
    this.init();
  }

  public init() {
    if (this.initialized) return;

    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      this.resetToSeedData();
    } else {
      // Run automatic 90-day inactivity check (Business Rule 7)
      this.checkInactivityArchiving();
    }
    this.initialized = true;
  }

  public resetToSeedData() {
    safeSetItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    safeSetItem(STORAGE_KEYS.REPORTS, JSON.stringify(INITIAL_REPORTS));
    safeSetItem(STORAGE_KEYS.MATCHES, JSON.stringify(INITIAL_MATCH_SUGGESTIONS));
    safeSetItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(INITIAL_NOTIFICATIONS));
    safeSetItem(STORAGE_KEYS.ADMIN_ACTIONS, JSON.stringify(INITIAL_ADMIN_ACTIONS));
    safeSetItem(STORAGE_KEYS.SIGNUP_ATTEMPTS, JSON.stringify({}));
    safeSetItem(STORAGE_KEYS.SIMULATED_EMAILS, JSON.stringify([]));

    // Store demo hashes
    const passwords: Record<string, string> = {};
    INITIAL_USERS.forEach((u) => {
      passwords[u.email.toLowerCase()] = DEMO_PASSWORD_HASH;
    });
    safeSetItem(STORAGE_KEYS.PASSWORDS, JSON.stringify(passwords));
  }

  // --- USERS ---
  public getUsers(): User[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USERS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public saveUsers(users: User[]) {
    safeSetItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }

  public getUserById(id: string): User | undefined {
    return this.getUsers().find((u) => u.id === id);
  }

  public getUserByEmail(email: string): User | undefined {
    return this.getUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public saveUser(user: User) {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      users[idx] = user;
    } else {
      users.push(user);
    }
    this.saveUsers(users);
    firestoreSync.saveUser(user);
  }

  public deleteUser(id: string) {
    const users = this.getUsers().filter((u) => u.id !== id);
    this.saveUsers(users);
  }

  // --- PASSWORDS ---
  public getPasswordHash(email: string): string | undefined {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PASSWORDS);
      const passwords = data ? JSON.parse(data) : {};
      const hash = passwords[email.toLowerCase()];
      if (hash === 'demo_sha256_campus2026') {
        return DEMO_PASSWORD_HASH;
      }
      return hash;
    } catch {
      return undefined;
    }
  }

  public setPasswordHash(email: string, hash: string) {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PASSWORDS);
      const passwords = data ? JSON.parse(data) : {};
      passwords[email.toLowerCase()] = hash;
      safeSetItem(STORAGE_KEYS.PASSWORDS, JSON.stringify(passwords));
    } catch (e) {
      if (e instanceof Error && e.message.includes('Storage is full')) {
        throw e;
      }
    }
  }

  public deletePasswordHash(email: string) {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PASSWORDS);
      const passwords = data ? JSON.parse(data) : {};
      delete passwords[email.toLowerCase()];
      safeSetItem(STORAGE_KEYS.PASSWORDS, JSON.stringify(passwords));
    } catch {}
  }

  // --- CURRENT USER SESSION ---
  public getCurrentUser(): User | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  public setCurrentUser(user: User | null) {
    if (user) {
      safeSetItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }

  // --- REPORTS ---
  public getReports(): ItemReport[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.REPORTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public saveReports(reports: ItemReport[]) {
    safeSetItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
  }

  public getReportById(id: string): ItemReport | undefined {
    return this.getReports().find((r) => r.id === id);
  }

  public saveReport(report: ItemReport) {
    const reports = this.getReports();
    const idx = reports.findIndex((r) => r.id === report.id);
    if (idx >= 0) {
      reports[idx] = report;
    } else {
      reports.push(report);
    }
    this.saveReports(reports);
    firestoreSync.saveReport(report);
  }

  // Business Rule 7: 90 days inactivity moves to Archived
  public runInactivityArchiving() {
    this.checkInactivityArchiving();
  }

  private checkInactivityArchiving() {
    const reports = this.getReports();
    const now = new Date().getTime();
    let updated = false;

    reports.forEach((r) => {
      if (r.status !== 'Archived' && r.status !== 'Returned') {
        const lastActivity = new Date(r.lastActivityAt || r.createdAt).getTime();
        const daysDiff = (now - lastActivity) / (1000 * 60 * 60 * 24);
        if (daysDiff >= INACTIVITY_ARCHIVE_DAYS) {
          r.status = 'Archived';
          r.locked = true;
          updated = true;
        }
      }
    });

    if (updated) {
      this.saveReports(reports);
    }
  }

  // --- MATCH SUGGESTIONS ---
  public getMatchSuggestions(): MatchSuggestion[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MATCHES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public saveMatchSuggestions(matches: MatchSuggestion[]) {
    safeSetItem(STORAGE_KEYS.MATCHES, JSON.stringify(matches));
  }

  public saveMatchSuggestion(match: MatchSuggestion) {
    const matches = this.getMatchSuggestions();
    const idx = matches.findIndex((m) => m.id === match.id);
    if (idx >= 0) {
      matches[idx] = match;
    } else {
      matches.push(match);
    }
    this.saveMatchSuggestions(matches);
    firestoreSync.saveMatch(match);
  }

  // --- NOTIFICATIONS ---
  public getNotifications(): Notification[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public saveNotifications(notifications: Notification[]) {
    safeSetItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  }

  public addNotification(notification: Notification) {
    const notifs = this.getNotifications();
    notifs.unshift(notification);
    this.saveNotifications(notifs);
    firestoreSync.saveNotification(notification);
  }

  // --- ADMIN ACTIONS / AUDIT LOG ---
  public getAdminActions(): AdminAction[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ADMIN_ACTIONS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public saveAdminActions(actions: AdminAction[]) {
    safeSetItem(STORAGE_KEYS.ADMIN_ACTIONS, JSON.stringify(actions));
  }

  public addAdminAction(action: AdminAction) {
    const actions = this.getAdminActions();
    actions.unshift(action);
    this.saveAdminActions(actions);
    firestoreSync.saveAdminAction(action);
  }

  // --- SIGNUP ATTEMPTS RATE LIMITING ---
  public getSignupAttempts(): Record<string, SignupAttempt> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SIGNUP_ATTEMPTS);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  public saveSignupAttempts(attempts: Record<string, SignupAttempt>) {
    safeSetItem(STORAGE_KEYS.SIGNUP_ATTEMPTS, JSON.stringify(attempts));
  }

  // --- SIMULATED EMAILS ---
  public getSimulatedEmails(): SimulatedEmail[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SIMULATED_EMAILS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public saveSimulatedEmails(emails: SimulatedEmail[]) {
    safeSetItem(STORAGE_KEYS.SIMULATED_EMAILS, JSON.stringify(emails));
  }

  public addSimulatedEmail(email: SimulatedEmail) {
    const emails = this.getSimulatedEmails();
    emails.unshift(email);
    this.saveSimulatedEmails(emails);
  }
}

export const appStorage = new AppStorage();
