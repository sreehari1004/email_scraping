import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  Globe, 
  Check, 
  X, 
  Clock, 
  MoreVertical,
  Loader2
} from 'lucide-react';
import type { Job, JobWebsite } from '../types';

interface ProgressViewProps {
  jobId: number;
  onBack: () => void;
  onViewJob: (jobId: number) => void;
}

export const ProgressView: React.FC<ProgressViewProps> = ({ jobId, onBack, onViewJob }) => {
  const [job, setJob] = useState<Job | null>(null);
  const [percent, setPercent] = useState<number>(0);
  const [websites, setWebsites] = useState<JobWebsite[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const fetchProgress = async () => {
      try {
        const res = await fetch(`/api/scrape/progress/${jobId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted) {
          setJob(data.job);
          setPercent(data.percent);
          setWebsites(data.websites);
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchProgress();
    const interval = setInterval(() => {
      if (job?.status !== 'Completed' && job?.status !== 'Failed') {
        fetchProgress();
      }
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [jobId, job?.status]);

  if (loading && !job) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const total = job?.total_websites || websites.length || 1;
  const completed = job?.completed_websites || 0;
  const failed = job?.failed_websites || 0;
  const inProgress = job?.in_progress_websites || Math.max(0, total - (completed + failed));

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-600 cursor-pointer"
            title="Back to Home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
              Scraping in progress
              {job?.status === 'Completed' && (
                <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-semibold border border-emerald-200">
                  Completed
                </span>
              )}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Your scraping job is running in the background. You can leave this page and come back later.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-semibold text-slate-700 shadow-xs">
            JD
          </div>
        </div>
      </div>

      {/* Progress Bar Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs mb-8">
        <div className="flex justify-between items-center mb-2.5">
          <span className="text-sm font-semibold text-slate-800">Processing websites...</span>
          <span className="text-sm font-bold text-slate-800">{percent}%</span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Websites */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Websites</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{total}</div>
        </div>

        {/* Completed */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Check className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed</span>
          </div>
          <div className="text-3xl font-extrabold text-emerald-600">{completed}</div>
        </div>

        {/* Failed */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <X className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Failed</span>
          </div>
          <div className="text-3xl font-extrabold text-red-600">{failed}</div>
        </div>

        {/* In Progress */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">In Progress</span>
          </div>
          <div className="text-3xl font-extrabold text-blue-600">{inProgress}</div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Recent Activity</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Website</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Contacts Found</th>
                <th className="py-3.5 px-6">Last Updated</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {websites.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Initializing scraping queue...
                  </td>
                </tr>
              ) : (
                websites.map((site) => (
                  <tr key={site.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6 font-medium text-slate-900 flex items-center gap-2.5">
                      <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{site.website}</span>
                    </td>
                    <td className="py-4 px-6">
                      {site.status === 'Completed' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Completed
                        </span>
                      )}
                      {site.status === 'In Progress' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                          In Progress
                        </span>
                      )}
                      {site.status === 'Failed' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-800">
                      {site.status === 'In Progress' ? '-' : site.contacts_count}
                    </td>
                    <td className="py-4 px-6 text-slate-500 text-xs">
                      {site.last_updated}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onViewJob(jobId)}
                          className="px-3 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          View
                        </button>
                        <button className="text-slate-400 hover:text-slate-600 p-1 rounded-md">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
