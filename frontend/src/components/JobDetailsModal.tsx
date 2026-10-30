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
      (c.email && c.email.toLowerCase().includes(term)) ||
      (c.phone && c.phone.toLowerCase().includes(term))
    );
  });

  const domain = websites[0]?.website || job?.job_name || 'Website';
  const siteUrl = websites[0]?.url || (job?.job_name?.startsWith('http') ? job.job_name : `https://${domain}`);

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
                  {domain}
                </h3>
                <a 
                  href={siteUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-xs text-slate-400 hover:text-blue-600 hover:underline"
                >
                  {siteUrl}
                </a>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Metadata Chips */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="text-right">
                <div className="font-semibold text-slate-700">{job?.created_at}</div>
                <div className="text-slate-400">{job?.duration || '00:00:03'} #{String(jobId).padStart(5, '0')}</div>
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
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action & Filter Bar */}
        <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="text-sm font-semibold text-slate-800">
            Contacts ({contacts.length})
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search contacts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 w-56 shadow-2xs"
              />
            </div>

            <button
              onClick={() => handleExport('csv')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          </div>
        </div>

        {/* Contacts Table Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-6">Email</th>
                    <th className="py-3.5 px-6">Phone Number</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredContacts.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-8 text-center text-slate-400">
                        No contacts found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredContacts.map((contact, idx) => (
                      <tr key={contact.id || idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-6 font-medium text-slate-800">
                          {contact.email ? (
                            <a href={`mailto:${contact.email}`} className="text-slate-900 hover:text-blue-600 hover:underline">
                              {contact.email}
                            </a>
                          ) : (
                            <span className="text-slate-400 italic">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-6 text-slate-700 font-mono text-xs">
                          {contact.phone ? (
                            <a href={`tel:${contact.phone}`} className="hover:text-blue-600 hover:underline">
                              {contact.phone}
                            </a>
                          ) : (
                            <span className="text-slate-400 italic">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
