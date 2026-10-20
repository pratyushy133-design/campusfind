import React, { useEffect, useState } from 'react';
import { ItemReport } from '../../types';
import { reportService } from '../../services/reportService';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Button } from '../../components/common/Button';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Tag,
  Palette,
  FileText,
  Lock,
  Edit3,
  ShieldCheck,
  Building,
  Info,
} from 'lucide-react';

interface ReportStatusScreenProps {
  reportId: string;
  onBack: () => void;
  onEdit: (reportId: string) => void;
}

export const ReportStatusScreen: React.FC<ReportStatusScreenProps> = ({
  reportId,
  onBack,
  onEdit,
}) => {
  const [report, setReport] = useState<ItemReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, [reportId]);

  const loadReport = async () => {
    setLoading(true);
    const data = await reportService.getReportById(reportId);
    setReport(data);
    setLoading(false);
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading report status...</div>;
  }

  if (!report) {
    return (
      <div className="max-w-xl mx-auto p-8 text-center space-y-4">
        <h2 className="text-base font-bold text-slate-800">Report not found</h2>
        <p className="text-xs text-slate-500">
          You do not have permission to view this report, or it may have been removed.
        </p>
        <Button variant="secondary" size="md" onClick={onBack}>
          Back to My Reports
        </Button>
      </div>
    );
  }

  // Plain-English explanation of what each status means (Section 4 Screen 5)
  const getStatusExplanation = () => {
    switch (report.status) {
      case 'Submitted':
        return 'Your report has been logged in the system. When potential matching items are found on campus, administrators will review them.';
      case 'Under Review':
        return 'Campus security and lost-and-found staff are currently checking campus logs and reviewing item descriptions.';
      case 'Possible Match':
        return 'A potential match has been flagged for staff evaluation. Campus security will examine item details before reaching out.';
      case 'Pending Verification':
        return 'A potential match is undergoing ownership verification. If this is your item, an administrator will contact you with specific questions.';
      case 'Returned':
        return 'This item has been successfully verified and returned. This report case is now resolved and closed.';
      case 'Rejected':
        return 'This claim could not be validated or did not meet verification criteria. Please contact security if you need clarification.';
      case 'Archived':
        return 'This report has been archived following the 90-day retention window. It is kept for historical campus records.';
      default:
        return 'Your report is being handled by campus administration.';
    }
  };

  // Editing Lock enforcement (Section 6 Business Rule 2 & 4)
  const isEditingLocked =
    report.locked ||
    report.status === 'Pending Verification' ||
    report.status === 'Returned' ||
    report.status === 'Archived';

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to My Reports
        </button>

        {/* Action Button: Edit or Lock Notice */}
        {!isEditingLocked ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onEdit(report.id)}
            leftIcon={<Edit3 className="w-3.5 h-3.5 mr-1" />}
          >
            Edit Report
          </Button>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>Editing locked</span>
          </div>
        )}
      </div>

      {/* Editing Lock Message for Student (Business Rule 2) */}
      {isEditingLocked && (
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <p>
            {report.status === 'Pending Verification'
              ? 'Editing is locked because this report is currently undergoing match verification.'
              : 'This case is closed or archived and is read-only for university record-keeping.'}
          </p>
        </div>
      )}

      {/* Main Status Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        {/* Title & Status */}
        <div className="space-y-3 pb-6 border-b border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className={`text-[11px] font-bold uppercase px-2.5 py-0.5 rounded ${
                report.type === 'lost'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {report.type === 'lost' ? 'Lost Item Report' : 'Found Item Report'}
            </span>
            <span className="text-xs font-mono text-slate-400">Ref: #{report.id}</span>
          </div>

          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {report.itemName}
          </h1>

          {/* Status Badge + Plain English Line */}
          <div className="pt-2 flex flex-col gap-2">
            <div>
              <StatusBadge status={report.status} size="lg" />
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 leading-relaxed font-medium">
              <span className="font-bold text-slate-900 block mb-0.5">Status meaning:</span>
              {getStatusExplanation()}
            </div>
          </div>
        </div>

        {/* Submitted Details Grid */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Submitted Item Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <Tag className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-semibold">Category</span>
              </div>
              <div className="text-sm font-bold text-slate-900">{report.category}</div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <Palette className="w-3.5 h-3.5 text-rose-600" />
                <span className="font-semibold">Colour</span>
              </div>
              <div className="text-sm font-bold text-slate-900 capitalize">{report.colour}</div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-semibold">Campus Location</span>
              </div>
              <div className="text-sm font-bold text-slate-900">{report.location}</div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span className="font-semibold">Reported Date</span>
              </div>
              <div className="text-sm font-bold text-slate-900">{report.date}</div>
            </div>
          </div>

          {/* Where item is now (Found item only) */}
          {report.whereItemIs && (
            <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-900 font-bold mb-1">
                <Building className="w-3.5 h-3.5 text-emerald-700" />
                <span>Handover Location</span>
              </div>
              <p className="text-slate-800">{report.whereItemIs}</p>
            </div>
          )}

          {/* Free-text Description */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <FileText className="w-3.5 h-3.5" />
              <span>Full Description</span>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
              {report.description}
            </div>
          </div>

          {/* Photo (if uploaded) */}
          {report.imageUrl && (
            <div className="space-y-1.5 pt-2">
              <span className="text-xs font-semibold text-slate-600 block">Attached Photo</span>
              <div className="border border-slate-200 rounded-xl overflow-hidden p-2 bg-slate-50 inline-block">
                <img
                  src={report.imageUrl}
                  alt={report.imageAltText || 'Item photograph'}
                  className="max-h-48 rounded-lg object-contain"
                />
                {report.imageAltText && (
                  <p className="text-[11px] text-slate-500 mt-1.5 italic">
                    Description: {report.imageAltText}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Privacy Note */}
        <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Protected under Australian Privacy Principles. Suggested matches, scores, and other campus users' reports are strictly hidden.
          </span>
        </div>
      </div>
    </div>
  );
};
