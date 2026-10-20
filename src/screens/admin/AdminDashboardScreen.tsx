import React, { useEffect, useState } from 'react';
import { User, ItemReport, MatchSuggestion, Notification } from '../../types';
import { reportService } from '../../services/reportService';
import { matchService } from '../../services/matchService';
import { notificationService } from '../../services/notificationService';
import { adminAccountService } from '../../services/adminAccountService';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Button } from '../../components/common/Button';
import {
  GitCompare,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Bell,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface AdminDashboardScreenProps {
  currentUser: User;
  onNavigate: (screen: string, reportId?: string, matchId?: string) => void;
}

export const AdminDashboardScreen: React.FC<AdminDashboardScreenProps> = ({
  currentUser,
  onNavigate,
}) => {
  const [reports, setReports] = useState<ItemReport[]>([]);
  const [matches, setMatches] = useState<MatchSuggestion[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [flaggedUsersCount, setFlaggedUsersCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    const [allReports, queueMatches, notifs, flaggedUsers] = await Promise.all([
      reportService.getReportsForAdmin(),
      matchService.getAdminMatchingQueue(),
      notificationService.getAdminNotifications(),
      adminAccountService.getFlaggedUsers(),
    ]);

    setReports(allReports);
    setMatches(queueMatches);
    setNotifications(notifs);
    setFlaggedUsersCount(flaggedUsers.length);
    setLoading(false);
  };

  const statusCounts = {
    Submitted: reports.filter((r) => r.status === 'Submitted').length,
    UnderReview: reports.filter((r) => r.status === 'Under Review').length,
    PossibleMatch: reports.filter((r) => r.status === 'Possible Match').length,
    PendingVerification: reports.filter((r) => r.status === 'Pending Verification').length,
    Returned: reports.filter((r) => r.status === 'Returned').length,
    Rejected: reports.filter((r) => r.status === 'Rejected').length,
    Archived: reports.filter((r) => r.status === 'Archived').length,
  };

  const pendingMatchesCount = matches.filter((m) => m.status === 'pending').length;
  const topMatches = matches.slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Administrative Control Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Overview of Victoria University campus lost &amp; found inventory, match queue, and security alerts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onNavigate('admin_search')}
            leftIcon={<FileText className="w-4 h-4 mr-1" />}
          >
            Search All Reports
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate('admin_queue')}
            leftIcon={<GitCompare className="w-4 h-4 mr-1" />}
          >
            Review Match Queue ({pendingMatchesCount} new)
          </Button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* New matches waiting */}
        <div
          onClick={() => onNavigate('admin_queue')}
          className="bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer space-y-2"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">New Matches Waiting</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <GitCompare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{pendingMatchesCount}</div>
          <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
            <span>Score threshold &ge; 45%</span>
            <ArrowRight className="w-3 h-3" />
          </p>
        </div>

        {/* Pending Verification */}
        <div
          onClick={() => onNavigate('admin_search', undefined)}
          className="bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer space-y-2"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">In Verification</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{statusCounts.PendingVerification}</div>
          <p className="text-[11px] text-slate-500 font-medium">Undergoing category checklist</p>
        </div>

        {/* Flagged Accounts */}
        <div
          onClick={() => onNavigate('admin_flagged')}
          className="bg-white p-5 rounded-xl border border-slate-200 hover:border-amber-400 hover:shadow-xs transition-all cursor-pointer space-y-2"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Flagged Accounts</span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                flaggedUsersCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-700'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{flaggedUsersCount}</div>
          <p
            className={`text-[11px] font-medium ${
              flaggedUsersCount > 0 ? 'text-amber-600' : 'text-slate-500'
            }`}
          >
            Abuse / high rejection counts
          </p>
        </div>

        {/* Successfully Returned */}
        <div
          onClick={() => onNavigate('admin_archive')}
          className="bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer space-y-2"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Items Returned</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{statusCounts.Returned}</div>
          <p className="text-[11px] text-slate-500 font-medium">Verified ownership cases closed</p>
        </div>
      </div>

      {/* Reports Count by Status (Section 4 Screen 1) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Campus Report Status Breakdown
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-center">
          <div className="p-3 rounded-xl bg-white border border-slate-200 flex flex-col items-center justify-center">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
              <span className="text-[11px] font-medium text-slate-600">Submitted</span>
            </div>
            <div className="text-xl font-semibold text-slate-900">{statusCounts.Submitted}</div>
          </div>
          <div className="p-3 rounded-xl bg-white border border-slate-200 flex flex-col items-center justify-center">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              <span className="text-[11px] font-medium text-slate-600">Under Review</span>
            </div>
            <div className="text-xl font-semibold text-slate-900">{statusCounts.UnderReview}</div>
          </div>
          <div className="p-3 rounded-xl bg-white border border-slate-200 flex flex-col items-center justify-center">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
              <span className="text-[11px] font-medium text-slate-600">Possible Match</span>
            </div>
            <div className="text-xl font-semibold text-slate-900">{statusCounts.PossibleMatch}</div>
          </div>
          <div className="p-3 rounded-xl bg-white border border-slate-200 flex flex-col items-center justify-center">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-amber-600 inline-block" />
              <span className="text-[11px] font-medium text-slate-600">Pending Verif.</span>
            </div>
            <div className="text-xl font-semibold text-slate-900">{statusCounts.PendingVerification}</div>
          </div>
          <div className="p-3 rounded-xl bg-white border border-slate-200 flex flex-col items-center justify-center">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span className="text-[11px] font-medium text-slate-600">Returned</span>
            </div>
            <div className="text-xl font-semibold text-slate-900">{statusCounts.Returned}</div>
          </div>
          <div className="p-3 rounded-xl bg-white border border-slate-200 flex flex-col items-center justify-center">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              <span className="text-[11px] font-medium text-slate-600">Rejected</span>
            </div>
            <div className="text-xl font-semibold text-slate-900">{statusCounts.Rejected}</div>
          </div>
          <div className="p-3 rounded-xl bg-white border border-slate-200 flex flex-col items-center justify-center">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
              <span className="text-[11px] font-medium text-slate-600">Archived</span>
            </div>
            <div className="text-xl font-semibold text-slate-900">{statusCounts.Archived}</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Top Matches Waiting + Admin Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Matches Waiting (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Top Matches Waiting Review</h2>
              <p className="text-xs text-slate-500">
                Ranked by hybrid weighted scoring (Category 35% + Description 30% + Location 20% + Date 10% + Colour 5%)
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('admin_queue')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5 ml-1" />}
            >
              Full Queue
            </Button>
          </div>

          {topMatches.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-500">
              No pending matches waiting in the queue.
            </div>
          ) : (
            <div className="space-y-3">
              {topMatches.map((m) => (
                <div
                  key={m.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 hover:border-blue-400 hover:shadow-xs transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                            m.totalScore >= 75
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {m.label} ({m.totalScore.toFixed(1)}%)
                        </span>
                        <span className="text-xs text-slate-500">
                          {m.lostReport?.category}
                        </span>
                      </div>
                      <div className="font-bold text-sm text-slate-900">
                        {m.lostReport?.itemName} <span className="text-slate-400 font-normal">vs</span> {m.foundReport?.itemName}
                      </div>
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onNavigate('admin_verification', m.lostReportId, m.id)}
                    >
                      Review &amp; Verify
                    </Button>
                  </div>

                  {/* Quick breakdown pill */}
                  <div className="grid grid-cols-5 gap-1.5 text-[11px] bg-slate-50 p-2 rounded-xl text-slate-600 border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Category</span>
                      <span className="font-semibold text-slate-800">{m.categoryScore}/35</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Description</span>
                      <span className="font-semibold text-slate-800">{m.descriptionScore}/30</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Location</span>
                      <span className="font-semibold text-slate-800">{m.locationScore}/20</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Date</span>
                      <span className="font-semibold text-slate-800">{m.dateScore}/10</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Colour</span>
                      <span className="font-semibold text-slate-800">{m.colourScore}/5</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security & System Notifications (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-600" />
              Admin Alerts
            </h2>
            <span className="text-xs text-slate-500">Latest activity</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No active notifications.
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span
                      className={`font-bold px-1.5 py-0.5 rounded uppercase tracking-wider text-[10px] ${
                        n.type === 'abuse_alert'
                          ? 'bg-rose-100 text-rose-800'
                          : n.type === 'account_flagged'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {n.type.replace('_', ' ')}
                    </span>
                    <span className="text-slate-400">
                      {new Date(n.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 leading-snug font-medium">
                    {n.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
