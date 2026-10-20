import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { ItemReport, User, AdminAction, MatchSuggestion, Notification } from '../types';

let syncPaused = false;

const isSyncEnabled = () =>
  !syncPaused &&
  typeof import.meta !== 'undefined' &&
  import.meta.env &&
  import.meta.env.VITE_ENABLE_FIRESTORE_SYNC === 'true';

export const firestoreSync = {
  setSyncPaused(paused: boolean) {
    syncPaused = paused;
  },

  async saveReport(report: ItemReport): Promise<void> {
    if (!isSyncEnabled()) return;
    try {
      await setDoc(doc(db, 'item_reports', report.id), {
        ...report,
        // sanitize undefined
        whereItemIs: report.whereItemIs || null,
        imageUrl: report.imageUrl || null,
        imageAltText: report.imageAltText || null,
        matchedWithReportId: report.matchedWithReportId || null,
        verificationNotes: report.verificationNotes || null,
        descriptionTokens: report.descriptionTokens || [],
      });
    } catch (error) {
      // Non-blocking background sync warning or handler
      console.warn('Firestore sync (report):', error);
    }
  },

  async saveUser(user: User): Promise<void> {
    if (!isSyncEnabled()) return;
    try {
      await setDoc(doc(db, 'users', user.id), {
        ...user,
        flagReason: user.flagReason || null,
      });
    } catch (error) {
      console.warn('Firestore sync (user):', error);
    }
  },

  async saveAdminAction(action: AdminAction): Promise<void> {
    if (!isSyncEnabled()) return;
    try {
      await setDoc(doc(db, 'admin_actions', action.id), {
        ...action,
        reportId: action.reportId || null,
        targetUserId: action.targetUserId || null,
        outcome: action.outcome || null,
        secondDetailChecked: action.secondDetailChecked ?? null,
        verificationLog: action.verificationLog || [],
      });
    } catch (error) {
      console.warn('Firestore sync (adminAction):', error);
    }
  },

  async saveMatch(match: MatchSuggestion): Promise<void> {
    if (!isSyncEnabled()) return;
    try {
      await setDoc(doc(db, 'match_suggestions', match.id), {
        id: match.id,
        lostReportId: match.lostReportId,
        foundReportId: match.foundReportId,
        categoryScore: match.categoryScore,
        descriptionScore: match.descriptionScore,
        locationScore: match.locationScore,
        dateScore: match.dateScore,
        colourScore: match.colourScore,
        totalScore: match.totalScore,
        label: match.label,
        status: match.status,
        createdAt: match.createdAt,
      });
    } catch (error) {
      console.warn('Firestore sync (match):', error);
    }
  },

  async saveNotification(notification: Notification): Promise<void> {
    if (!isSyncEnabled()) return;
    try {
      await setDoc(doc(db, 'notifications', notification.id), {
        id: notification.id,
        audience: notification.audience,
        type: notification.type,
        message: notification.message,
        relatedId: notification.relatedId || null,
        read: notification.read,
        createdAt: notification.createdAt,
      });
    } catch (error) {
      console.warn('Firestore sync (notification):', error);
    }
  },
};
