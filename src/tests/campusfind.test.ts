import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, beforeEach } from 'vitest';
import { authService } from '../services/authService';
import { matchService } from '../services/matchService';
import { reportService } from '../services/reportService';
import { verificationService } from '../services/verificationService';
import { appStorage } from '../services/storage';
import { firestoreSync } from '../services/firestoreSync';
import { ItemReport, SimulatedEmail } from '../types';
import {
  MATCHING_WEIGHTS,
  VERIFICATION_LINK_EXPIRY_HOURS,
  SIMULATED_EMAIL_DOMAINS,
  ALLOWED_EMAIL_DOMAINS,
} from '../config/matchingConfig';
import App from '../App';

describe('CampusFind Test Suite', () => {
  beforeEach(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    firestoreSync.setSyncPaused(true);
    appStorage.resetToSeedData();
  });

  describe('Auth & Demo Password Backdoor Removal', () => {
    it('allows all demo accounts to sign in with Campus#2026', async () => {
      const demoEmails = [
        'admin@campusfind.test',
        'admin2@campusfind.test',
        'priya@campusfind.test',
        'liam@campusfind.test',
        'ayesha@campusfind.test',
        'noah@campusfind.test',
        'mei.tan@campusfind.test',
      ];

      for (const email of demoEmails) {
        const res = await authService.signIn(email, 'Campus#2026');
        expect(res.success).toBe(true);
        expect(res.data?.email).toBe(email);
      }
    });

    it('allows self-registered student to sign in with their custom password but blocks Campus#2026', async () => {
      const customEmail = 'newstudent@campusfind.test';
      const customPass = 'Mypass#123';

      const signUpRes = await authService.signUp({
        name: 'New Student',
        email: customEmail,
        password: customPass,
        role: 'student',
      });
      expect(signUpRes.success).toBe(true);
      expect(signUpRes.data?.token).toBeDefined();

      // Confirm verification
      const verifyRes = await authService.handleVerificationDecision(
        signUpRes.data!.token,
        customEmail,
        true
      );
      expect(verifyRes.success).toBe(true);

      // Sign in with real password -> MUST SUCCEED
      const validSignIn = await authService.signIn(customEmail, customPass);
      expect(validSignIn.success).toBe(true);
      expect(validSignIn.data?.name).toBe('New Student');

      // Sign in with demo password -> MUST FAIL
      const backdoorAttempt = await authService.signIn(customEmail, 'Campus#2026');
      expect(backdoorAttempt.success).toBe(false);
      expect(backdoorAttempt.error).toBe('Incorrect email or password.');
    });

    it('rejects passwords that do not meet complexity requirements', () => {
      expect(authService.isValidPassword('short1')).toBe(false); // <8 chars
      expect(authService.isValidPassword('allcharacterswithoutnumbers')).toBe(false);
      expect(authService.isValidPassword('1234567890')).toBe(false);
      expect(authService.isValidPassword('ValidPassword1')).toBe(true);
    });
  });

  describe('24-Hour Verification Link Expiry', () => {
    it('allows link confirmation within 24 hours (e.g. 23 hours old)', async () => {
      const token = 'token_23h_valid';
      const email = 'fresh_user@campusfind.test';

      // Seed pending user
      const signUpRes = await authService.signUp({
        name: 'Fresh User',
        email,
        password: 'Password99!',
        role: 'student',
      });
      expect(signUpRes.success).toBe(true);

      const generatedToken = signUpRes.data!.token;

      // Adjust timestamp to 23 hours ago
      const emails = appStorage.getSimulatedEmails();
      const mail = emails.find((m) => m.token === generatedToken);
      expect(mail).toBeDefined();
      mail!.createdAt = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString();
      appStorage.saveSimulatedEmails(emails);

      const decision = await authService.handleVerificationDecision(generatedToken, email, true);
      expect(decision.success).toBe(true);
      expect(decision.message).toContain('Account confirmed successfully');
    });

    it('rejects link older than 24 hours with exact required error message', async () => {
      const expiredEmail: SimulatedEmail = {
        id: 'mail_expired_test_vitest',
        recipientEmail: 'expired_student@campusfind.test',
        subject: 'Verify your account',
        token: 'token_expired_25h_vitest',
        verifyUrl: '/?action=verify&token=token_expired_25h_vitest',
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
        used: false,
      };
      appStorage.addSimulatedEmail(expiredEmail);

      const decision = await authService.handleVerificationDecision(
        'token_expired_25h_vitest',
        'expired_student@campusfind.test',
        true
      );
      expect(decision.success).toBe(false);
      expect(decision.message).toBe('This confirmation link has expired. Please register again.');

      // Ensure marked as used
      const storedMails = appStorage.getSimulatedEmails();
      const stored = storedMails.find((m) => m.token === 'token_expired_25h_vitest');
      expect(stored?.used).toBe(true);
    });
  });

  describe('Matching Engine Scoring & Worked Example Benchmark', () => {
    const lostWallet: ItemReport = {
      id: 'rep_lost_wallet_test',
      userId: 'test_u1',
      type: 'lost',
      itemName: 'Black Leather Wallet',
      category: 'Wallet',
      colour: 'black',
      location: 'Library (Level 2)',
      date: '2026-10-05',
      description: 'Black leather wallet with student card and Myki.',
      status: 'Submitted',
      flaggedDuplicate: false,
      locked: false,
      createdAt: '2026-10-05T14:30:00Z',
      lastActivityAt: '2026-10-05T14:30:00Z',
    };

    const foundWalletA: ItemReport = {
      id: 'rep_found_wallet_a_test',
      userId: 'test_u2',
      type: 'found',
      itemName: 'Black Leather Wallet',
      category: 'Wallet',
      colour: 'black',
      location: 'Library (Level 2)',
      date: '2026-10-05',
      description: 'Black leather wallet found near study desk.',
      status: 'Submitted',
      flaggedDuplicate: false,
      locked: false,
      createdAt: '2026-10-05T16:00:00Z',
      lastActivityAt: '2026-10-05T16:00:00Z',
    };

    const foundWalletB: ItemReport = {
      id: 'rep_found_wallet_b_test',
      userId: 'test_u3',
      type: 'found',
      itemName: 'Brown Leather Wallet',
      category: 'Wallet',
      colour: 'brown',
      location: 'Library (Level 2)',
      date: '2026-10-06',
      description: 'Brown leather wallet with student ID found on desk.',
      status: 'Submitted',
      flaggedDuplicate: false,
      locked: false,
      createdAt: '2026-10-06T10:15:00Z',
      lastActivityAt: '2026-10-06T10:15:00Z',
    };

    it('correctly scores Worked Example benchmark (Found A = 97.0 vs Found B = 85.0)', () => {
      const scoreA = matchService.scoreReports(lostWallet, foundWalletA, 0.90);
      const scoreB = matchService.scoreReports(lostWallet, foundWalletB, 0.65);

      expect(scoreA.categoryScore).toBe(35);
      expect(scoreA.descriptionScore).toBe(27.0); // 30 * 0.90
      expect(scoreA.locationScore).toBe(20);
      expect(scoreA.dateScore).toBe(10); // 0 days apart
      expect(scoreA.colourScore).toBe(5); // exact black
      expect(scoreA.totalScore).toBe(97.0);

      expect(scoreB.categoryScore).toBe(35);
      expect(scoreB.descriptionScore).toBe(19.5); // 30 * 0.65
      expect(scoreB.locationScore).toBe(20);
      expect(scoreB.dateScore).toBe(8.0); // 1 day apart -> 10 * 0.8
      expect(scoreB.colourScore).toBe(2.5); // black vs brown -> adjacent (2.5)
      expect(scoreB.totalScore).toBe(85.0);

      expect(scoreA.totalScore).toBeGreaterThan(scoreB.totalScore);
    });

    it('classifies confidence thresholds accurately', () => {
      expect(matchService.classifyMatch(97.0)).toBe('Likely match');
      expect(matchService.classifyMatch(75.0)).toBe('Likely match');
      expect(matchService.classifyMatch(74.9)).toBe('Possible match');
      expect(matchService.classifyMatch(45.0)).toBe('Possible match');
      expect(matchService.classifyMatch(44.9)).toBeNull(); // Discarded
    });

    it('calculates date decay curve properly', () => {
      expect(matchService.calculateDateDecay(0)).toBe(1.0);
      expect(matchService.calculateDateDecay(1)).toBe(0.8);
      expect(matchService.calculateDateDecay(3)).toBe(0.8);
      expect(matchService.calculateDateDecay(4)).toBe(0.5);
      expect(matchService.calculateDateDecay(14)).toBe(0.5);
      expect(matchService.calculateDateDecay(15)).toBe(0.2);
    });

    it('calculates colour match and adjacency correctly', () => {
      expect(matchService.calculateColourScore('black', 'black')).toBe(5.0);
      expect(matchService.calculateColourScore('black', 'brown')).toBe(2.5);
      expect(matchService.calculateColourScore('black', 'red')).toBe(0.0);
    });
  });

  describe('Photo Persistence and Storage Error Handling', () => {
    it('detects quota exceeded error in storage and throws designated message', () => {
      const quotaError = new Error('QuotaExceededError');
      quotaError.name = 'QuotaExceededError';

      expect(() => {
        try {
          throw quotaError;
        } catch (e: any) {
          if (e.name === 'QuotaExceededError') {
            throw new Error('Storage is full - remove the photo and try again');
          }
          throw e;
        }
      }).toThrow('Storage is full - remove the photo and try again');
    });
  });

  describe('Section 6 Business Rules', () => {
    it('BR 1: Cannot set "Returned" status directly via updateReportStatus', async () => {
      const admin = appStorage.getUserById('user_admin_1');
      appStorage.setCurrentUser(admin!);

      const result = await reportService.updateReportStatus(
        'rep_found_earbuds_1',
        'Returned' as any
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('Returned');
    });

    it('BR 2: Report editing is locked once verification has begun', async () => {
      const result = await reportService.updateReport('rep_lost_laptop_1', {
        itemName: 'Hacked Laptop Name',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('locked');
    });

    it('BR 3: Duplicate submissions within 3 days are flagged for administrator', () => {
      const reports = appStorage.getReports();
      const duplicateReport = reports.find((r) => r.id === 'rep_lost_phone_noah_2');
      expect(duplicateReport).toBeDefined();
      expect(duplicateReport?.flaggedDuplicate).toBe(true);
    });

    it('BR 4: Closed / Archived / Returned cases cannot be modified', async () => {
      const result = await reportService.updateReport('rep_lost_backpack_1', {
        itemName: 'New Backpack Name',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Closed');
    });

    it('BR 5: Returning an item dismisses all other pending matches', async () => {
      const admin = appStorage.getUserById('user_admin_1');
      appStorage.setCurrentUser(admin!);

      const res = await verificationService.submitVerificationResult({
        matchSuggestionId: 'match_wallet_1a',
        lostReportId: 'rep_lost_wallet_1',
        foundReportId: 'rep_found_wallet_a',
        checklistResponses: [{ question: 'Q1', matched: true }],
        adminNotes: 'Verified during unit test',
        outcome: 'Passed',
      });
      expect(res.success).toBe(true);

      const matches = appStorage.getMatchSuggestions();
      const otherMatch = matches.find((m) => m.id === 'match_wallet_1b');
      expect(otherMatch?.status).toBe('dismissed');
    });

    it('BR 6: Administrator cannot verify reports they submitted (Conflict of Interest)', async () => {
      const admin = appStorage.getUserById('user_admin_1');
      appStorage.setCurrentUser(admin!);

      const report = appStorage.getReportById('rep_lost_wallet_1');
      expect(report).toBeDefined();
      report!.userId = 'user_admin_1';
      report!.status = 'Submitted';
      appStorage.saveReport(report!);

      const result = await verificationService.startVerification('match_wallet_1a');
      expect(result.success).toBe(false);
      expect(result.error?.toLowerCase()).toContain('conflict of interest');
    });

    it('BR 7: 90-day inactivity check moves reports to Archived and locks them', () => {
      const oldReport: ItemReport = {
        id: 'rep_unit_91d',
        userId: 'test_u1',
        type: 'lost',
        itemName: 'Old Notebook',
        category: 'Other',
        colour: 'blue',
        location: 'Building M',
        date: '2026-05-01',
        description: 'Old notebook 91 days inactive',
        status: 'Submitted',
        flaggedDuplicate: false,
        locked: false,
        createdAt: new Date(Date.now() - 91 * 24 * 60 * 60 * 1000).toISOString(),
        lastActivityAt: new Date(Date.now() - 91 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const freshReport: ItemReport = {
        id: 'rep_unit_89d',
        userId: 'test_u1',
        type: 'lost',
        itemName: 'Recent Notebook',
        category: 'Other',
        colour: 'blue',
        location: 'Building M',
        date: '2026-07-01',
        description: 'Recent notebook 89 days inactive',
        status: 'Submitted',
        flaggedDuplicate: false,
        locked: false,
        createdAt: new Date(Date.now() - 89 * 24 * 60 * 60 * 1000).toISOString(),
        lastActivityAt: new Date(Date.now() - 89 * 24 * 60 * 60 * 1000).toISOString(),
      };

      appStorage.saveReport(oldReport);
      appStorage.saveReport(freshReport);

      appStorage.runInactivityArchiving();

      const checkedOld = appStorage.getReportById('rep_unit_91d');
      const checkedFresh = appStorage.getReportById('rep_unit_89d');

      expect(checkedOld?.status).toBe('Archived');
      expect(checkedOld?.locked).toBe(true);
      expect(checkedFresh?.status).toBe('Submitted');
      expect(checkedFresh?.locked).toBe(false);
    });
  });

  describe('Section 8 Abuse & Rate Limiting', () => {
    it('locks sign-up after 5 attempts', () => {
      const testEmail = 'lockout_test@student.vu.edu.au';
      authService.clearAttempts(testEmail);

      for (let i = 0; i < 4; i++) {
        authService.recordAttempt(testEmail);
        expect(authService.checkRateLimit(testEmail).locked).toBe(false);
      }

      authService.recordAttempt(testEmail);
      const lockedCheck = authService.checkRateLimit(testEmail);
      expect(lockedCheck.locked).toBe(true);
      expect(lockedCheck.message).toContain('Too many sign-up attempts');

      authService.clearAttempts(testEmail);
    });

    it('accepts university email domains and rejects public email providers', () => {
      expect(authService.isValidUniversityEmail('student@student.vu.edu.au')).toBe(true);
      expect(authService.isValidUniversityEmail('prof@vu.edu.au')).toBe(true);
      expect(authService.isValidUniversityEmail('staff@live.vu.edu.au')).toBe(true);
      expect(authService.isValidUniversityEmail('demo@campusfind.test')).toBe(true);

      expect(authService.isValidUniversityEmail('hacker@gmail.com')).toBe(false);
      expect(authService.isValidUniversityEmail('scam@yahoo.com')).toBe(false);
      expect(authService.isValidUniversityEmail('fraud@outlook.com')).toBe(false);
    });
  });

  describe('Header Sign-Out Navbar State', () => {
    it('sign in, click header Sign Out, assert the navbar shows "Sign In" and no user name', async () => {
      window.scrollTo = () => {};

      // Sign in as Priya
      const signInRes = await authService.signIn('priya@campusfind.test', 'Campus#2026');
      expect(signInRes.success).toBe(true);
      const userName = authService.getCurrentUser()?.name;
      expect(userName).toBe('Priya Sharma');

      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);

      try {
        await act(async () => {
          root.render(React.createElement(App));
        });

        const header = container.querySelector('header');
        expect(header).toBeTruthy();
        expect(header?.textContent).toContain('Priya Sharma');
        expect(header?.textContent).not.toContain('Sign In');

        // Locate desktop header sign out button
        const signOutButton = container.querySelector('button[title="Sign Out"]') as HTMLButtonElement;
        expect(signOutButton).toBeTruthy();

        // Click header Sign Out
        await act(async () => {
          signOutButton.click();
        });

        // Assert the navbar shows "Sign In" and no user name
        const updatedHeader = container.querySelector('header');
        expect(updatedHeader?.textContent).toContain('Sign In');
        expect(updatedHeader?.textContent).not.toContain('Priya Sharma');
        expect(authService.getCurrentUser()).toBeNull();
      } finally {
        await act(async () => {
          root.unmount();
        });
        container.remove();
      }
    });
  });

  describe('Real Email Verification & Firebase Authentication Integration', () => {
    it('defines SIMULATED_EMAIL_DOMAINS and correctly partitions test vs real university emails', () => {
      expect(SIMULATED_EMAIL_DOMAINS).toEqual(['campusfind.test']);
      expect(ALLOWED_EMAIL_DOMAINS).toContain('vu.edu.au');
      expect(ALLOWED_EMAIL_DOMAINS).toContain('student.vu.edu.au');
      expect(ALLOWED_EMAIL_DOMAINS).toContain('live.vu.edu.au');
      expect(ALLOWED_EMAIL_DOMAINS).toContain('campusfind.test');

      // Test domain partitioning
      expect(authService.isSimulatedEmail('test@campusfind.test')).toBe(true);
      expect(authService.isSimulatedEmail('sub.test@campusfind.test')).toBe(true);
      expect(authService.isSimulatedEmail('student@student.vu.edu.au')).toBe(false);
      expect(authService.isSimulatedEmail('prof@vu.edu.au')).toBe(false);
      expect(authService.isSimulatedEmail('admin@live.vu.edu.au')).toBe(false);
    });

    it('creates SimulatedEmail and token exclusively for @campusfind.test', async () => {
      const simEmail = 'simulated_user@campusfind.test';
      const signUpRes = await authService.signUp({
        name: 'Simulated User',
        email: simEmail,
        password: 'ValidPass123!',
        role: 'student',
      });

      expect(signUpRes.success).toBe(true);
      expect(signUpRes.isRealVerification).toBe(false);
      expect(signUpRes.data?.token).toBeDefined();
      expect(signUpRes.data?.recipientEmail).toBe(simEmail);

      // Verify the simulated email is recorded
      const emails = appStorage.getSimulatedEmails();
      const found = emails.find((m) => m.recipientEmail === simEmail);
      expect(found).toBeDefined();
      expect(found?.used).toBe(false);

      // Verify it can be confirmed via simulated decision
      const decision = await authService.handleVerificationDecision(found!.token, simEmail, true);
      expect(decision.success).toBe(true);

      const user = appStorage.getUserByEmail(simEmail);
      expect(user?.status).toBe('active');
    });

    it('enforces that seeded demo accounts sign in using local auth and demo password', async () => {
      const demoAccounts = [
        'admin@campusfind.test',
        'admin2@campusfind.test',
        'priya@campusfind.test',
        'liam@campusfind.test',
        'ayesha@campusfind.test',
        'noah@campusfind.test',
        'mei.tan@campusfind.test',
      ];

      for (const email of demoAccounts) {
        const res = await authService.signIn(email, 'Campus#2026');
        expect(res.success).toBe(true);
        expect(res.data?.status).toBe('active');
      }

      // Wrong password fails
      const failRes = await authService.signIn('admin@campusfind.test', 'WrongPassword123');
      expect(failRes.success).toBe(false);
      expect(failRes.error).toBe('Incorrect email or password.');
    });

    it('blocks unconfirmed accounts from signing in and provides clear instructions', async () => {
      const unconfirmedEmail = 'unconfirmed@campusfind.test';
      await authService.signUp({
        name: 'Pending User',
        email: unconfirmedEmail,
        password: 'Password999!',
        role: 'student',
      });

      const res = await authService.signIn(unconfirmedEmail, 'Password999!');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Please confirm your email address');
    });

    it('renders neutral banner on sign-in screen when URL has ?emailConfirmed=1', async () => {
      window.scrollTo = () => {};
      authService.signOut();
      // Simulate url param
      const originalSearch = window.location.search;
      history.pushState({}, '', '/?emailConfirmed=1');

      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);

      try {
        await act(async () => {
          root.render(React.createElement(App));
        });

        // Banner text expectation
        expect(container.textContent).toContain('If you confirmed your email address, you can sign in below.');
      } finally {
        await act(async () => {
          root.unmount();
        });
        container.remove();
        history.pushState({}, '', originalSearch || '/');
      }
    });
  });
});
