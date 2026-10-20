import React, { useEffect, useState } from 'react';
import { User, ItemReport, ReportStatus, CAMPUS_LOCATIONS } from '../../types';
import { reportService, ReportFilterOptions } from '../../services/reportService';
import { StatusBadge } from '../../components/common/StatusBadge';
import { CategoryDropdown } from '../../components/common/CategoryDropdown';
import { Button } from '../../components/common/Button';
import {
  Search,
  Filter,
  Calendar,
  MapPin,
  Tag,
  Palette,
  FileText,
  User as UserIcon,
  X,
  AlertCircle,
  Building,
  CheckCircle2,
  Lock,
} from 'lucide-react';

interface SearchFilterReportsScreenProps {
  currentUser: User;
  onNavigateToVerification?: (lostReportId: string) => void;
}

export const SearchFilterReportsScreen: React.FC<SearchFilterReportsScreenProps> = ({
  currentUser,
  onNavigateToVerification,
}) => {
  const [reports, setReports] = useState<ItemReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<ItemReport | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState('All');
  const [location, setLocation] = useState('All');
  const [type, setType] = useState<'All' | 'lost' | 'found'>('All');

  // Status Change Modal State
  const [statusChangeOpen, setStatusChangeOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<ReportStatus>('Under Review');
  const [statusReason, setStatusReason] = useState('');
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, [search, category, status, location, type]);

  const loadReports = async () => {
    setLoading(true);
    const filters: ReportFilterOptions = {
      search: search.trim() || undefined,
      category: category !== 'All' ? category : undefined,
      status: status !== 'All' ? status : undefined,
      location: location !== 'All' ? location : undefined,
      type: type !== 'All' ? type : undefined,
    };
    const data = await reportService.getReportsForAdmin(filters);
    setReports(data);
    setLoading(false);
  };

  const handleUpdateStatus = async () => {
    if (!selectedReport) return;
    setStatusError(null);

    // Business Rule 1 check: No manual 'Returned' option
    if (newStatus === 'Returned') {
      setStatusError('Returned status can only be set via the Ownership Verification protocol.');
      return;
    }

    const res = await reportService.updateReportStatus(
      selectedReport.id,
      newStatus,
      statusReason
    );

    if (res.success) {
      setStatusChangeOpen(false);
      setStatusReason('');
      // Reload reports and updated detail
      loadReports();
      const updated = await reportService.getReportById(selectedReport.id);
      setSelectedReport(updated);
    } else {
      setStatusError(res.error || 'Failed to update status.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Search &amp; Filter Reports
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Authorised administrator inventory across all Victoria University campus locations.
          </p>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search keywords, items, descriptions, submitter names, colours..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
          />
        </div>

        {/* Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {/* Category */}
          <div>
            <label className="block text-slate-500 font-semibold mb-1">Category</label>
            <CategoryDropdown
              value={category}
              onChange={(val) => setCategory(val)}
              includeAllOption
              label=""
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-slate-500 font-semibold mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
            >
              <option value="All">All Statuses</option>
              <option value="Submitted">Submitted</option>
              <option value="Under Review">Under Review</option>
              <option value="Possible Match">Possible Match</option>
              <option value="Pending Verification">Pending Verification</option>
              <option value="Returned">Returned</option>
              <option value="Rejected">Rejected</option>
              <option value="Archived">Archived</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-slate-500 font-semibold mb-1">Report Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
            >
              <option value="All">All Types</option>
              <option value="lost">Lost Only</option>
              <option value="found">Found Only</option>
            </select>
          </div>

          {/* Location Filter */}
          <div>
            <label className="block text-slate-500 font-semibold mb-1">Campus Location</label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
            >
              <option value="All">All Locations</option>
              {CAMPUS_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area: List + Selected Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reports List (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Showing {reports.length} reports</span>
            {(search || category !== 'All' || status !== 'All' || location !== 'All' || type !== 'All') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setCategory('All');
                  setStatus('All');
                  setLocation('All');
                  setType('All');
                }}
                className="text-blue-600 hover:underline cursor-pointer"
              >
                Clear all filters
              </button>
            )}
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading reports...</div>
          ) : reports.length === 0 ? (
            /* Empty State (Section 4 Screen 4) */
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-slate-800">No Reports Match Filter Criteria</h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try widening your search terms, changing the category, or selecting "All Statuses".
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {reports.map((r) => {
                const isSelected = selectedReport?.id === r.id;

                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedReport(r)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer bg-white ${
                      isSelected
                        ? 'border-blue-600 ring-2 ring-blue-600/20 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                              r.type === 'lost'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {r.type}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">#{r.id}</span>
                          <h3 className="font-bold text-sm text-slate-900 truncate">
                            {r.itemName}
                          </h3>
                        </div>

                        <p className="text-xs text-slate-600 line-clamp-2">
                          {r.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 pt-1">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {r.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {r.date}
                          </span>
                          <span className="flex items-center gap-1">
                            <UserIcon className="w-3 h-3 text-slate-400" />
                            {r.userName}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        <StatusBadge status={r.status} size="sm" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Report Inspection Panel (1 col) */}
        <div className="lg:col-span-1">
          {selectedReport ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sticky top-20 space-y-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Report Details
                  </span>
                  <h2 className="text-base font-bold text-slate-900 truncate">
                    {selectedReport.itemName}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status and Badge */}
              <div className="flex items-center justify-between">
                <StatusBadge status={selectedReport.status} size="md" />
                <span className="text-xs font-mono text-slate-400">ID: {selectedReport.id}</span>
              </div>

              {/* Submitter info (Admin only view - Section 1) */}
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-xs space-y-1">
                <span className="font-bold text-blue-900 block">Submitting User Information</span>
                <p className="text-slate-800"><strong>Name:</strong> {selectedReport.userName}</p>
                <p className="text-slate-800"><strong>Email:</strong> {selectedReport.userEmail}</p>
              </div>

              {/* Attributes list */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Category:</span>
                  <span className="font-semibold text-slate-900">{selectedReport.category}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Colour:</span>
                  <span className="font-semibold text-slate-900 capitalize">{selectedReport.colour}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Location:</span>
                  <span className="font-semibold text-slate-900">{selectedReport.location}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Date:</span>
                  <span className="font-semibold text-slate-900">{selectedReport.date}</span>
                </div>
                {selectedReport.whereItemIs && (
                  <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-900 text-xs">
                    <strong>Handover Custody:</strong> {selectedReport.whereItemIs}
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-700">Description:</span>
                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 whitespace-pre-wrap">
                  {selectedReport.description}
                </p>
              </div>

              {/* Photo preview if present */}
              {selectedReport.imageUrl && (
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-700">Photo &amp; Alt text:</span>
                  <div className="border border-slate-200 rounded-xl p-2 bg-slate-50">
                    <img
                      src={selectedReport.imageUrl}
                      alt={selectedReport.imageAltText || 'Attached item photo'}
                      className="max-h-36 rounded-lg object-contain mx-auto"
                    />
                    <p className="text-[10px] text-slate-500 mt-1 italic">
                      Alt: {selectedReport.imageAltText}
                    </p>
                  </div>
                </div>
              )}

              {/* Allowed Admin Actions */}
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-700 block">Admin Actions</span>

                {/* Status Change Button */}
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => {
                    setNewStatus(selectedReport.status === 'Archived' ? 'Submitted' : 'Under Review');
                    setStatusError(null);
                    setStatusChangeOpen(true);
                  }}
                >
                  Change Status
                </Button>

                {/* If Pending Verification, allow jump to verification */}
                {selectedReport.status === 'Pending Verification' && onNavigateToVerification && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => onNavigateToVerification(selectedReport.id)}
                  >
                    Open Verification Checklist &rarr;
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-400">
              Select any report from the left to inspect full private details and perform administrative actions.
            </div>
          )}
        </div>
      </div>

      {/* Change Status Modal (Business Rule 1: No manual Returned option) */}
      {statusChangeOpen && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Update Status: {selectedReport.itemName}
            </h3>

            {statusError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
                {statusError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as ReportStatus)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                >
                  <option value="Submitted">Submitted</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Possible Match">Possible Match</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Archived">Archived</option>
                  {/* Note: "Returned" is intentionally EXCLUDED per Business Rule 1 */}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  * Business Rule 1: The "Returned" status cannot be set manually. It is granted strictly via successful ownership verification.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Administrative Reason / Note
                </label>
                <input
                  type="text"
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="e.g. Manual audit completed by security desk"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setStatusChangeOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleUpdateStatus}
              >
                Save Status
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
