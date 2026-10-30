import React, { useState } from 'react';
import { 
  Link2, 
  FileText, 
  UploadCloud, 
  Play, 
  CheckCircle2, 
  FileSpreadsheet, 
  FileCode2, 
  FileCheck,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Header } from '../components/Header';

interface HomeViewProps {
  onStartScraping: (jobId: number) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onStartScraping }) => {
  const [activeTab, setActiveTab] = useState<'url' | 'upload'>('url');
  const [urlInput, setUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStats, setUploadStats] = useState<{ filename: string; count: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/scrape/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Failed to parse uploaded file');
      }

      const data = await res.json();
      setUploadStats({ filename: data.filename, count: data.count });
      setUrlInput(data.urls.join('\n'));
      setActiveTab('url');
    } catch (err: any) {
      setError(err.message || 'Error uploading file');
    } finally {
      setIsUploading(false);
    }
  };

  const urlCount = urlInput
    .split('\n')
    .map((u) => u.trim())
    .filter((u) => u.length > 0).length;

  const handleStart = async () => {
    setError(null);
    const urlsToScrape = urlInput
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (urlsToScrape.length === 0) {
      setError('Please enter at least one website URL');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/scrape/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: urlsToScrape }),
      });

      if (!res.ok) {
        throw new Error('Failed to start scraping task');
      }

      const data = await res.json();
      onStartScraping(data.job_id);
    } catch (err: any) {
      setError(err.message || 'Error starting scraping');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <Header
        title="Home"
        subtitle="Extract contact details from websites. Paste a website URL, add multiple URLs, or upload a file to get started."
      />

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {uploadStats && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-800 text-sm">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-emerald-600" />
            <span>Extracted <strong>{uploadStats.count}</strong> valid URLs from <strong>{uploadStats.filename}</strong></span>
          </div>
          <button 
            onClick={() => setUploadStats(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold uppercase"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main URL Submission Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          {/* Segmented Control Tabs */}
          <div className="inline-flex p-1.5 bg-slate-100 rounded-xl mb-6">
            <button
              onClick={() => setActiveTab('url')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'url'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Link2 className="w-4 h-4" />
              URL
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              Upload File
            </button>
          </div>

          {/* Form Content */}
          {activeTab === 'url' && (
            <div className="space-y-4">
              <textarea
                rows={8}
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder={`Paste a single URL or multiple URLs (one per line)
https://example.com
https://anothersite.com`}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 font-mono text-sm focus:outline-hidden focus:border-blue-500 focus:bg-white resize-y shadow-2xs"
              />
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Enter a single website URL or paste multiple URLs (one per line).</span>
                {urlCount > 0 && (
                  <span className="font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                    {urlCount} {urlCount === 1 ? 'URL' : 'URLs'} entered
                  </span>
                )}
              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-4">
              <label className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer bg-slate-50 hover:bg-blue-50/30 transition-colors">
                <UploadCloud className="w-10 h-10 text-blue-600 mb-3" />
                <span className="text-sm font-semibold text-slate-800">
                  Click to browse or drop file here
                </span>
                <span className="text-xs text-slate-500 mt-1">
                  Supports CSV, Excel (.xlsx, .xls) and PDF documents
                </span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.pdf"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
              </label>

              {isUploading && (
                <div className="flex items-center justify-center gap-2 text-sm text-blue-600 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Parsing and extracting URLs...</span>
                </div>
              )}
            </div>
          )}

          {/* Action Button */}
          <div className="mt-8">
            <button
              onClick={handleStart}
              disabled={isLoading || isUploading}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Starting Scraping Job...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  Start Scraping
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Info Cards */}
        <div className="space-y-6">
          {/* Supported File Formats */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h3 className="font-semibold text-slate-800 text-sm mb-4">Supported file formats</h3>
            <div className="space-y-3.5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-slate-700">CSV</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileCode2 className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-slate-700">Excel (.xlsx)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-slate-700">PDF</span>
              </div>
            </div>
          </div>

          {/* Tips Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h3 className="font-semibold text-slate-800 text-sm mb-4">Tips</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2.5 text-sm text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>One URL per line</span>
              </li>
              <li className="flex items-center gap-2.5 text-sm text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Remove duplicates</span>
              </li>
              <li className="flex items-center gap-2.5 text-sm text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Use valid URLs (including https://)</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

