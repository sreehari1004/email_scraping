import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Calendar, 
  Download, 
  MoreVertical, 
  Globe, 
  Trash2, 
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import type { Job } from '../types';
import { Header } from '../components/Header';
import { JobDetailsModal } from '../components/JobDetailsModal';

export const HistoryView: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('Last 7 days');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [activeJobId, setActiveJobId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '5',
        date_filter: dateFilter,
        status_filter: statusFilter,
      });
      if (search) params.append('search', search);

      const res = await fetch(`/api/history?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      setJobs(data.jobs);
      setTotalJobs(data.total);
      setTotalPages(data.total_pages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page, dateFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchHistory();
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(jobs.map((j) => j.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleDeleteJob = async (id: number) => {
    if (!confirm('Are you sure you want to delete this scraping record?')) return;
    try {
      await fetch(`/api/history/${id}`, { method: 'DELETE' });
      fetchHistory();
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} selected records?`)) return;
    try {
      await fetch('/api/history/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_ids: selectedIds }),
      });
      setSelectedIds([]);
      fetchHistory();
    } catch (err) {
      console.error(err);
    }
  };

  const handleExport = (format: 'csv' | 'xlsx', targetJobId?: number) => {
    const params = new URLSearchParams({ format });
    if (targetJobId) {
      params.append('job_id', targetJobId.toString());
    } else if (selectedIds.length > 0) {
      params.append('job_ids', selectedIds.join(','));
    }
    window.location.href = `/api/history/export?${params.toString()}`;
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <Header
        title="History"
        subtitle="View and manage your past scraping jobs."
      />

      {/* Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by website, URL, or contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-hidden focus:border-blue-500 shadow-2xs"
          />
        </form>

        <div className="flex items-center gap-3">
          {/* Date Filter */}
          <div className="relative">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="appearance-none bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs focus:outline-hidden"
            >
              <option value="Today">Today</option>
              <option value="Last 7 days">Last 7 days</option>
              <option value="Last 30 days">Last 30 days</option>
              <option value="All time">All time</option>
            </select>
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs focus:outline-hidden"
            >
              <option value="All statuses">All statuses</option>
              <option value="Completed">Completed</option>
              <option value="Failed">Failed</option>
              <option value="In Progress">In Progress</option>
            </select>
          </div>

          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-sm font-medium rounded-xl transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Delete ({selectedIds.length})
            </button>
          )}

          {/* Export Button */}
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            {selectedIds.length > 0 ? `Export (${selectedIds.length} Selected)` : 'Export'}
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-5 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={jobs.length > 0 && selectedIds.length === jobs.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-6">Website / URL</th>
                <th className="py-3.5 px-6">Date & Time</th>
                <th className="py-3.5 px-6">Contacts Found</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading records...
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No scraping history records found.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => {
                  return (
                    <tr key={job.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-5 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(job.id)}
                          onChange={() => handleToggleSelect(job.id)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                        />
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                            <Globe className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{job.job_name}</div>
                            <div className="text-xs text-slate-400">
                              {job.job_name.startsWith('http') ? job.job_name : `https://${job.job_name}`}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6 text-slate-600 text-xs font-medium">
                        {job.created_at}
                      </td>

                      <td className="py-4 px-6 font-semibold text-slate-800">
                        {job.contacts_found}
                      </td>

                      <td className="py-4 px-6">
                        {job.status === 'Completed' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Completed
                          </span>
                        )}
                        {job.status === 'Failed' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            Failed
                          </span>
                        )}
                        {job.status === 'In Progress' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            In Progress
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2 relative">
                          <button
                            onClick={() => setActiveJobId(job.id)}
                            className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors cursor-pointer shadow-2xs"
                          >
                            View
                          </button>

                          <div className="relative">
                            <button
                              onClick={() => setOpenMenuId(openMenuId === job.id ? null : job.id)}
                              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {openMenuId === job.id && (
                              <div className="absolute right-0 mt-1 w-36 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-20 text-left">
                                <button
                                  onClick={() => {
                                    handleExport('csv', job.id);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                >
                                  <Download className="w-3.5 h-3.5" /> Export Company
                                </button>
                                <button
                                  onClick={() => {
                                    handleDeleteJob(job.id);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Delete Job
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {jobs.length > 0 ? (page - 1) * 5 + 1 : 0}-{Math.min(page * 5, totalJobs)} of {totalJobs} jobs
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-7 h-7 rounded-lg font-semibold transition-colors ${
                  page === p
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Dialog */}
      {activeJobId !== null && (
        <JobDetailsModal
          jobId={activeJobId}
          onClose={() => setActiveJobId(null)}
        />
      )}
    </div>
  );
};
