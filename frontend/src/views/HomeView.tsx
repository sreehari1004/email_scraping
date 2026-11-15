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
  Loader2,
  Compass,
  MapPin,
  Briefcase,
  ExternalLink,
  CheckSquare,
  Square,
  ArrowRight
} from 'lucide-react';
import { Header } from '../components/Header';

interface DiscoveredWebsite {
  domain: string;
  url: string;
  title: string;
  snippet?: string;
}

interface HomeViewProps {
  onStartScraping: (jobId: number) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onStartScraping }) => {
  const [activeTab, setActiveTab] = useState<'url' | 'upload' | 'discover'>('url');
  
  // URL Input State
  const [urlInput, setUrlInput] = useState('');
  
  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStats, setUploadStats] = useState<{ filename: string; count: number } | null>(null);
  
  // Discovery State
  const [nicheInput, setNicheInput] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [maxResults, setMaxResults] = useState(20);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveredSites, setDiscoveredSites] = useState<DiscoveredWebsite[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());

  // General Loading & Error State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // File Upload Handler
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

  // Standard Scrape Start
  const handleStart = async (overrideUrls?: string[], loc?: string, nch?: string) => {
    setError(null);
    const urlsToScrape = overrideUrls || urlInput
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (urlsToScrape.length === 0) {
      setError('Please enter at least one website URL or discover websites first');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/scrape/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          urls: urlsToScrape,
          location: loc || locationInput,
          niche: nch || nicheInput
        }),
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

  // Discover Websites Handler
  const handleDiscover = async () => {
    if (!nicheInput.trim() && !locationInput.trim()) {
      setError('Please provide at least a Domain/Niche or Location');
      return;
    }

    setError(null);
    setIsDiscovering(true);
    setDiscoveredSites([]);
    setSelectedUrls(new Set());

    try {
      const res = await fetch('/api/scrape/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche: nicheInput.trim(),
          location: locationInput.trim(),
          max_results: maxResults,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to discover websites');
      }

      const data = await res.json();
      const sites: DiscoveredWebsite[] = data.websites || [];
      if (sites.length === 0) {
        setError(`No websites found for "${nicheInput}" in "${locationInput}". Try broader keywords.`);
      } else {
        setDiscoveredSites(sites);
        setSelectedUrls(new Set(sites.map((s) => s.url)));
      }
    } catch (err: any) {
      setError(err.message || 'Error discovering websites');
    } finally {
      setIsDiscovering(false);
    }
  };

  // Toggle selection
  const handleToggleSelect = (url: string) => {
    setSelectedUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedUrls.size === discoveredSites.length) {
      setSelectedUrls(new Set());
    } else {
      setSelectedUrls(new Set(discoveredSites.map((s) => s.url)));
    }
  };

  // Transfer discovered URLs to URL tab
  const handleTransferToUrlTab = () => {
    const urls = Array.from(selectedUrls);
    if (urls.length === 0) return;
    setUrlInput(urls.join('\n'));
    setActiveTab('url');
  };

  // Direct discover & start
  const handleDiscoverAndStart = async () => {
    if (!nicheInput.trim() && !locationInput.trim()) {
      setError('Please provide at least a Domain/Niche or Location');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/scrape/discover-and-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche: nicheInput.trim(),
          location: locationInput.trim(),
          max_results: maxResults,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to discover and start scraping');
      }

      const data = await res.json();
      onStartScraping(data.job_id);
    } catch (err: any) {
      setError(err.message || 'Error starting automated discovery & scrape');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <Header
        title="Home"
        subtitle="Extract contact details from websites. Discover target businesses by niche & location, paste website URLs, or upload a file."
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
            className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold uppercase cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          {/* Segmented Control Tabs */}
          <div className="inline-flex p-1.5 bg-slate-100 rounded-xl mb-6 gap-1 flex-wrap">
            <button
              onClick={() => setActiveTab('discover')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'discover'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Compass className="w-4 h-4" />
              Discover by Niche & Location
            </button>
            <button
              onClick={() => setActiveTab('url')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'url'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Link2 className="w-4 h-4" />
              Paste URLs
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

          {/* TAB 1: DISCOVER BY NICHE & LOCATION */}
          {activeTab === 'discover' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Domain / Niche Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Industry / Domain / Niche
                  </label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      value={nicheInput}
                      onChange={(e) => setNicheInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleDiscover()}
                      placeholder="e.g. perfume dealers, electronics wholesale"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:outline-hidden focus:border-blue-500 focus:bg-white shadow-2xs"
                    />
                  </div>
                </div>

                {/* Location Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Location / Country / City
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleDiscover()}
                      placeholder="e.g. Russia, Dubai, New York"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:outline-hidden focus:border-blue-500 focus:bg-white shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Discovery Controls */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Max Websites to Find:</span>
                  <select
                    value={maxResults}
                    onChange={(e) => setMaxResults(Number(e.target.value))}
                    className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:border-blue-500"
                  >
                    <option value={10}>10 websites</option>
                    <option value={20}>20 websites</option>
                    <option value={30}>30 websites</option>
                    <option value={50}>50 websites</option>
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDiscover}
                    disabled={isDiscovering || isLoading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {isDiscovering ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Finding Businesses...
                      </>
                    ) : (
                      <>
                        <Compass className="w-4 h-4" />
                        Find Websites
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleDiscoverAndStart}
                    disabled={isDiscovering || isLoading}
                    title="Find websites and immediately start scraping contact details"
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-xl transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        Auto Discover & Scrape
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Discovered Websites List */}
              {discoveredSites.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleSelectAll}
                        className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-blue-600 cursor-pointer"
                      >
                        {selectedUrls.size === discoveredSites.length ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                        <span>
                          {selectedUrls.size === discoveredSites.length ? 'Deselect All' : 'Select All'}
                        </span>
                      </button>
                      <span className="text-xs text-slate-500">
                        • {selectedUrls.size} of {discoveredSites.length} selected
                      </span>
                    </div>

                    <button
                      onClick={handleTransferToUrlTab}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <span>Copy to URL Editor</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
                    {discoveredSites.map((site) => {
                      const isSelected = selectedUrls.has(site.url);
                      return (
                        <div
                          key={site.domain}
                          onClick={() => handleToggleSelect(site.url)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                            isSelected 
                              ? 'bg-blue-50/60 border-blue-200 text-slate-900 shadow-2xs' 
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <div className="mt-0.5">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400 shrink-0" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-slate-900 truncate">
                                {site.title}
                              </span>
                              <span className="text-xs font-mono text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md shrink-0">
                                {site.domain}
                              </span>
                            </div>
                            {site.snippet && (
                              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                                {site.snippet}
                              </p>
                            )}
                          </div>
                          <a
                            href={site.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded-md"
                            title="Open website"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      );
                    })}
                  </div>

                  {/* Scrape Selected Button */}
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => handleStart(Array.from(selectedUrls))}
                      disabled={isLoading || selectedUrls.size === 0}
                      className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Starting Scrape Job...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current" />
                          Scrape Selected Websites ({selectedUrls.size})
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PASTE URLS */}
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

              {/* Action Button */}
              <div className="mt-6">
                <button
                  onClick={() => handleStart()}
                  disabled={isLoading}
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
          )}

          {/* TAB 3: UPLOAD FILE */}
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
        </div>

        {/* Right Info Cards */}
        <div className="space-y-6">
          {activeTab === 'discover' ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <h3 className="font-semibold text-slate-800 text-sm mb-4">Discovery Tips</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2.5 text-sm text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Specify the Niche:</strong> e.g., <em>perfume dealers</em>, <em>cosmetics distributor</em>, or <em>hotel suppliers</em>.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Target the Region:</strong> Use country or city names like <em>Russia</em>, <em>Moscow</em>, or <em>Dubai</em>.</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Review & Filter:</strong> Deselect any irrelevant sites before initiating the deep contact extraction.</span>
                </li>
              </ul>
            </div>
          ) : (
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
          )}

          {/* General Tips Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h3 className="font-semibold text-slate-800 text-sm mb-4">Quality Scrapes</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2.5 text-sm text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Auto-cleans duplicate domains</span>
              </li>
              <li className="flex items-center gap-2.5 text-sm text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Extracts emails, phones & addresses</span>
              </li>
              <li className="flex items-center gap-2.5 text-sm text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Export results to CSV or Excel anytime</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
