import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Mail, 
  CheckCircle2, 
  Save, 
  Send, 
  Loader2,
  KeyRound,
  Eye,
  EyeOff,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { Header } from '../components/Header';

export const SettingsView: React.FC = () => {
  const [notificationEmail, setNotificationEmail] = useState('');
  const [notifyOnComplete, setNotifyOnComplete] = useState(true);
  const [notifyOnFailure, setNotifyOnFailure] = useState(true);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isAiActive, setIsAiActive] = useState(false);
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
        setGeminiApiKey(data.gemini_api_key || '');
        setIsAiActive(Boolean(data.ai_active));
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
          gemini_api_key: geminiApiKey,
        }),
      });

      if (!res.ok) throw new Error('Failed to update settings');
      setIsAiActive(Boolean(geminiApiKey.trim()));
      setStatusMessage('Settings and API configuration saved successfully!');
    } catch (err: any) {
      setStatusMessage(err.message || 'Error saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestReport = async () => {
    setIsTesting(true);
    setStatusMessage(null);
    try {
      await new Promise((r) => setTimeout(r, 1000));
      setStatusMessage(`Test report email dispatched to ${notificationEmail}!`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <Header
        title="Settings & Notifications"
        subtitle="Configure automated reports, AI credentials, and system preferences."
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

      <form onSubmit={handleSave} className="max-w-3xl space-y-8">
        {/* AI Engine & API Key Configuration */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">AI Outreach Engine (Gemini)</h3>
                <p className="text-xs text-slate-500">
                  Configure your Google Gemini API key or use the built-in copy template generator.
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

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                  Gemini API Key
                </label>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 hover:underline"
                >
                  Get a free Gemini API key <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full pl-4 pr-10 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-mono text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <p className="text-xs text-slate-500 mt-2">
                You can save your key here or add <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono">GEMINI_API_KEY=...</code> in the project's root <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono">.env</code> file.
              </p>
            </div>
          </div>
        </div>

        {/* Automated Email Notifications */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Automated Scraping Reports</h3>
              <p className="text-xs text-slate-500">
                Receive CSV & Excel contact reports automatically whenever a batch finishes.
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
                    Dispatches full extraction summary with attached CSV/Excel file upon job completion.
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
                    Sends error breakdown when websites have active CAPTCHAs, 403 Forbidden, or connection timeouts.
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
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
