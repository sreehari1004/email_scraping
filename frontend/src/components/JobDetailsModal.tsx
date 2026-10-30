import React, { useState, useEffect } from 'react';
import { 
  X, 
  Globe, 
  Search, 
  Download, 
  Loader2
} from 'lucide-react';
import type { Job, Contact, JobWebsite } from '../types';

interface JobDetailsModalProps {
  jobId: number;
  onClose: () => void;
}

export const JobDetailsModal: React.FC<JobDetailsModalProps> = ({ jobId, onClose }) => {
  const [job, setJob] = useState<Job | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [websites, setWebsites] = useState<JobWebsite[]>([]);
  const [activeTab, setActiveTab] = useState<'contacts' | 'websites' | 'summary'>('contacts');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await fetch(`/api/history/${jobId}`);
        if (!res.ok) return;
        const data = await res.json();
        setJob(data.job);
        setContacts(data.contacts);
        setWebsites(data.websites);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [jobId]);

  const handleExport = (format: 'csv' | 'xlsx') => {
    window.location.href = `/api/history/export?format=${format}&job_id=${jobId}`;
  };

  const filteredContacts = contacts.filter((c) => {
    const term = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term) ||
      c.phone.toLowerCase().includes(term)
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Job Details</h2>
            <div className="flex items-center gap-4 mt-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {job?.job_name?.split(' ')[0] || 'example1.com'}
                </h3>
                <span className="text-xs text-slate-400">
                  {websites[0]?.url || `https://${job?.job_name?.split(' ')[0] || 'example1.com'}`}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Metadata Chips */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="text-right">
                <div className="font-semibold text-slate-700">{job?.created_at}</div>
                <div className="text-slate-400">{job?.duration || '00:49:06'} {String(jobId).padStart(5, '0')}</div>
              </div>

              {job?.status === 'Completed' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Completed
                </span>
              )}
              {job?.status === 'Failed' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-medium bg-red-50 text-red-700 border border-red-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  Failed
                </span>
              )}

              <div className="bg-slate-100 px-3 py-1 rounded-lg font-bold text-slate-800">
                {contacts.length} <span className="font-normal text-slate-500">Contacts Found</span>
              </div>

              <div className="bg-slate-100 px-3 py-1 rounded-lg font-bold text-slate-800">
                {job?.failed_websites || 0} <span className="font-normal text-slate-500">Failed Websites</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('contacts')}
              className={`py-3.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'contacts'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Contacts ({contacts.length})
            </button>
            <button
              onClick={() => setActiveTab('websites')}
              className={`py-3.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'websites'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Website Details ({websites.length})
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`py-3.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'summary'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Summary
            </button>
          </div>

          {activeTab === 'contacts' && (
            <div className="flex items-center gap-3 py-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 w-52"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleExport('csv')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : activeTab === 'contacts' ? (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Phone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredContacts.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-slate-400">
                        No contacts found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredContacts.map((contact) => (
                      <tr key={contact.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {contact.name || 'N/A'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700">
                          {contact.email ? (
                            <a href={`mailto:${contact.email}`} className="hover:text-blue-600 hover:underline">
                              {contact.email}
                            </a>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-mono text-xs">
                          {contact.phone || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'websites' ? (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Website</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Contacts Extracted</th>
                    <th className="py-3 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {websites.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50/60">
                      <td className="py-3.5 px-4 font-semibold text-slate-900 flex items-center gap-2">
                        <Globe className="w-4 h-4 text-slate-400" />
                        <a href={w.url} target="_blank" rel="noreferrer" className="hover:text-blue-600 hover:underline">
                          {w.website}
                        </a>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          w.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${w.status === 'Completed' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          {w.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {w.contacts_count}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {w.error_message || 'Successfully crawled contact, team, and about pages.'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Total Web Targets</div>
                  <div className="text-2xl font-bold text-slate-900">{job?.total_websites}</div>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                  <div className="text-xs text-emerald-700 uppercase font-semibold mb-1">Successful Extractions</div>
                  <div className="text-2xl font-bold text-emerald-700">{job?.completed_websites}</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <div className="text-xs text-blue-700 uppercase font-semibold mb-1">Execution Elapsed</div>
                  <div className="text-2xl font-bold text-blue-700">{job?.duration}</div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                <h4 className="font-semibold text-slate-800 text-sm mb-3">Scraping Diagnostic Information</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  The automated multi-page extraction engine inspected homepage meta tags, header navigation items,
                  structured team directories, and standard contact routes (/contact, /about, /team). 
                  Validated regex filters eliminated junk emails and compiled telephone numbers into standardized international formats.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
