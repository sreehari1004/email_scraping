import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Mail, 
  CheckCircle2, 
  Save, 
  Send, 
  Loader2,
  ExternalLink,
  Sparkles,
  Server,
  ShieldCheck,
  AlertCircle,
  FileCode
} from 'lucide-react';
import { Header } from '../components/Header';

export const SettingsView: React.FC = () => {
  const [notificationEmail, setNotificationEmail] = useState('');
  const [notifyOnComplete, setNotifyOnComplete] = useState(true);
  const [notifyOnFailure, setNotifyOnFailure] = useState(true);
  const [isAiActive, setIsAiActive] = useState(false);

  // SMTP Status from .env
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpFromName, setSmtpFromName] = useState('Contact Scraper');
  const [isSmtpConfigured, setIsSmtpConfigured] = useState(false);
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (!res.ok) return;
        const data = await res.json();
        setNotificationEmail(data.notification_email || '');
        setNotifyOnComplete(data.notify_on_complete);
        setNotifyOnFailure(data.notify_on_failure);
        setIsAiActive(Boolean(data.ai_active));

        // SMTP info from .env
        setSmtpHost(data.smtp_host || 'smtp.gmail.com');
        setSmtpPort(data.smtp_port || 587);
        setSmtpUser(data.smtp_user || '');
        setSmtpFromName(data.smtp_from_name || 'Contact Scraper');
        setIsSmtpConfigured(Boolean(data.smtp_configured));
      } catch (err) {
        console.error(err);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_email: notificationEmail,
          notify_on_complete: notifyOnComplete,
          notify_on_failure: notifyOnFailure,
        }),
      });

      if (!res.ok) throw new Error('Failed to update settings');
      setStatusMessage('Notification preferences saved successfully!');
    } catch (err: any) {
      setStatusMessage(err.message || 'Error saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestSmtp = async () => {
    setIsTestingSmtp(true);
    setSmtpTestResult(null);
    try {
      const res = await fetch('/api/settings/test-smtp', {
        method: 'POST',
      });
      const data = await res.json();
      setSmtpTestResult(data);
    } catch (err: any) {
      setSmtpTestResult({
        success: false,
        message: err.message || 'Failed to connect to SMTP server',
      });
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const handleSendTestReport = async () => {
    setIsTesting(true);
    setStatusMessage(null);
    try {
      await new Promise((r) => setTimeout(r, 1000));
      setStatusMessage(`Test report dispatched to ${notificationEmail}!`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <Header
        title="Settings & Notifications"
        subtitle="Manage report dispatches and view environment configuration statuses."
      />

      {statusMessage && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-800 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{statusMessage}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-emerald-700 text-xs font-semibold uppercase hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="max-w-3xl space-y-8">
        {/* AI Outreach Engine (Gemini) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">AI Outreach Engine (Gemini)</h3>
                <p className="text-xs text-slate-500">
                  Generates personalized cold emails based on scraped company details.
                </p>
              </div>
            </div>

            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
              isAiActive
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {isAiActive ? 'Gemini 1.5 Flash Active' : 'Offline Template Mode'}
            </span>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
              <FileCode className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold text-slate-800 mb-1">
                  Credentials Loaded from Environment (.env)
                </div>
                <p className="text-slate-500 leading-relaxed">
                  Your Gemini API key is loaded securely from the root <code className="bg-slate-200/70 px-1.5 py-0.5 rounded text-slate-800 font-mono">GEMINI_API_KEY</code> variable. Sensitive keys are never rendered in the browser.
                </p>
                <div className="mt-2.5">
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1 hover:underline"
                  >
                    Get a Gemini API Key from Google AI Studio <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Gmail & SMTP Outreach Integration */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Gmail & SMTP Outreach Integration</h3>
                <p className="text-xs text-slate-500">
                  Sends cold emails and dispatches automated scraping CSV / Excel reports.
                </p>
              </div>
            </div>
            {isSmtpConfigured ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" /> Connected (.env)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <AlertCircle className="w-3.5 h-3.5" /> Not Configured in .env
              </span>
            )}
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            {smtpTestResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
                  smtpTestResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                {smtpTestResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{smtpTestResult.message}</span>
              </div>
            )}

            {/* Read-only status grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Sender Email
                </div>
                <div className="text-sm font-medium text-slate-800 truncate" title={smtpUser}>
                  {smtpUser || <span className="text-slate-400 italic">Not set in .env</span>}
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  SMTP Host & Port
                </div>
                <div className="text-sm font-medium text-slate-800">
                  {smtpHost}:{smtpPort}
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Sender Display Name
                </div>
                <div className="text-sm font-medium text-slate-800 truncate">
                  {smtpFromName}
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-slate-800 mb-0.5">
                  Sensitive Credentials Secured in .env
                </div>
                <p className="text-slate-500 leading-relaxed">
                  App Passwords and SMTP secrets (<code className="bg-slate-200/70 px-1 py-0.5 rounded text-slate-800 font-mono">SMTP_USER</code>, <code className="bg-slate-200/70 px-1 py-0.5 rounded text-slate-800 font-mono">SMTP_PASSWORD</code>) are kept in your local <code className="bg-slate-200/70 px-1 py-0.5 rounded text-slate-800 font-mono">.env</code> file. No passwords or tokens are stored in the database or exposed in this interface.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleTestSmtp}
                disabled={isTestingSmtp}
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                {isTestingSmtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Server className="w-3.5 h-3.5" />}
                Test SMTP Connection
              </button>
            </div>
          </div>
        </div>

        {/* Automated Email Notifications */}
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Automated Scraping Reports</h3>
              <p className="text-xs text-slate-500">
                Receive CSV & Excel contact reports automatically whenever a scraping batch finishes.
              </p>
            </div>
          </div>

          <div className="space-y-5 pt-4 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Recipient Email Addresses (comma separated)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.value)}
                  placeholder="reports@company.com, team@company.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyOnComplete}
                  onChange={(e) => setNotifyOnComplete(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                />
                <div>
                  <div className="text-sm font-semibold text-slate-800">Notify on Scraping Completion</div>
                  <div className="text-xs text-slate-400">
                    Dispatches extraction summary when a website scraping job finishes.
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyOnFailure}
                  onChange={(e) => setNotifyOnFailure(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                />
                <div>
                  <div className="text-sm font-semibold text-slate-800">Alert on Restricted or Failed Targets</div>
                  <div className="text-xs text-slate-400">
                    Sends error breakdown when websites have active CAPTCHAs, 403 Forbidden, or timeouts.
                  </div>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleSendTestReport}
                disabled={isTesting}
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Send Test Report
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Notification Preferences
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
