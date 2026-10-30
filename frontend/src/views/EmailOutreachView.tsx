import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Users, 
  Send, 
  Percent, 
  Building, 
  Sparkles, 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  Link as LinkIcon, 
  ChevronDown, 
  FileText, 
  Eye, 
  MoreVertical,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import type { OutreachLog } from '../types';
import { Header } from '../components/Header';

export const EmailOutreachView: React.FC = () => {
  const [stats, setStats] = useState({
    total_contacts: 0,
    available_recipients: 0,
    emails_sent: 0,
    success_rate: 0,
  });

  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [isBulk, setIsBulk] = useState(false);
  const [recipientsList, setRecipientsList] = useState('');

  const [aiPrompt, setAiPrompt] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showPersonalizeMenu, setShowPersonalizeMenu] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [logs, setLogs] = useState<OutreachLog[]>([]);

  const fetchOutreachData = async () => {
    try {
      const statsRes = await fetch('/api/outreach/stats');
      if (statsRes.ok) setStats(await statsRes.json());

      const logsRes = await fetch('/api/outreach/logs');
      if (logsRes.ok) setLogs(await logsRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOutreachData();
  }, []);

  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) {
      setNotification({ type: 'error', message: 'Please provide brief notes or a summary for the email purpose.' });
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch('/api/outreach/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          company_name: companyName,
        }),
      });

      if (!res.ok) throw new Error('AI generation failed');
      const data = await res.json();
      setSubject(data.subject);
      setBody(data.body);
      setNotification({ type: 'success', message: 'Email content generated successfully with AI!' });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error generating email' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInsertPlaceholder = (placeholder: string) => {
    setBody((prev) => prev + placeholder);
    setShowPersonalizeMenu(false);
  };

  const handleSendEmails = async () => {
    if (!subject.trim() || !body.trim()) {
      setNotification({ type: 'error', message: 'Subject and Email Body are required.' });
      return;
    }

    let targets: Array<{ company_name: string; email: string }> = [];

    if (isBulk) {
      const lines = recipientsList.split('\n').filter((l) => l.trim().length > 0);
      for (const line of lines) {
        const parts = line.split(',');
        if (parts.length >= 2) {
          targets.push({ company_name: parts[0].trim(), email: parts[1].trim() });
        } else if (line.includes('@')) {
          targets.push({ company_name: 'Organization', email: line.trim() });
        }
      }
    } else {
      if (!companyEmail.trim()) {
        setNotification({ type: 'error', message: 'Company Email is required.' });
        return;
      }
      targets.push({
        company_name: companyName.trim() || 'Organization',
        email: companyEmail.trim(),
      });
    }

    if (targets.length === 0) {
      setNotification({ type: 'error', message: 'No valid recipients configured.' });
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch('/api/outreach/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: targets,
          subject,
          body,
        }),
      });

      if (!res.ok) throw new Error('Failed to send outreach');
      const data = await res.json();
      setNotification({ type: 'success', message: `Successfully sent outreach to ${data.sent_count} recipients!` });
      fetchOutreachData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error sending emails' });
    } finally {
      setIsSending(false);
    }
  };

  const recipientLinesCount = recipientsList.split('\n').filter((l) => l.trim().length > 0).length;

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <Header
        title="Email Outreach"
        subtitle="Send emails to your extracted contacts using AI or custom templates."
      />

      {notification && (
        <div
          className={`mb-6 p-4 rounded-xl flex items-center justify-between text-sm ${
            notification.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs font-semibold uppercase hover:underline"
          >
            Close
          </button>
        </div>
      )}

      {/* 4 Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Contacts */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500">Total Contacts</span>
            <div className="text-2xl font-extrabold text-slate-900 mt-0.5">
              {stats.total_contacts.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Available Recipients */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500">Available Recipients</span>
            <div className="text-2xl font-extrabold text-slate-900 mt-0.5">
              {stats.available_recipients.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Emails Sent */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Send className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500">Emails Sent</span>
            <div className="text-2xl font-extrabold text-slate-900 mt-0.5">
              {stats.emails_sent.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500">Success Rate</span>
            <div className="text-2xl font-extrabold text-slate-900 mt-0.5">
              {stats.success_rate}%
            </div>
          </div>
        </div>
      </div>

      {/* Main Send Email Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs mb-8">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-900">Send Email</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Enter recipient details, create your email using AI or custom content, and send it.
          </p>
        </div>

        {/* Recipient inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Company Name (Optional)
            </label>
            <div className="relative">
              <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Enter company name..."
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Company Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                placeholder="Enter company email address..."
                value={companyEmail}
                onChange={(e) => setCompanyEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Bulk Toggle Switch */}
        <div className="flex items-center gap-3 py-3 border-y border-slate-100 mb-4">
          <button
            type="button"
            onClick={() => setIsBulk(!isBulk)}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
              isBulk ? 'bg-blue-600' : 'bg-slate-300'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                isBulk ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          <div>
            <div className="text-sm font-semibold text-slate-800">Bulk Send Emails</div>
            <div className="text-xs text-slate-400">Send to multiple company names and email addresses at once</div>
          </div>
        </div>

        {/* Recipients List when Bulk is active */}
        {isBulk && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Recipients List (Company Name & Email) <span className="text-red-500">*</span>
              </label>
              <span className="text-xs text-slate-400">{recipientLinesCount}/1000</span>
            </div>
            <p className="text-xs text-slate-400 mb-2">
              Enter multiple recipients (one per line) in the format: Company Name, email@company.com
            </p>
            <textarea
              rows={4}
              value={recipientsList}
              onChange={(e) => setRecipientsList(e.target.value)}
              placeholder="Acme Corp, john@acme.com&#10;Bright Solutions, sarah@bright.com"
              className="w-full p-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-mono text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white"
            />
          </div>
        )}

        {/* AI Email Generation Card */}
        <div className="bg-blue-50/40 border border-blue-100 rounded-2xl p-5 mb-6">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <div>
                <h4 className="font-bold text-slate-900 text-sm">AI Email Generation</h4>
                <p className="text-xs text-slate-500">
                  Paste your email summary or notes, and let AI create a professional email for you.
                </p>
              </div>
            </div>

            <button
              onClick={handleGenerateAI}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Generate with AI
                </>
              )}
            </button>
          </div>

          <textarea
            rows={3}
            placeholder="Paste your email summary, key points, or notes here..."
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            className="w-full p-3 bg-white border border-blue-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500"
          />
          <div className="text-right text-[10px] text-slate-400 mt-1">
            {aiPrompt.length}/1000
          </div>
        </div>

        {/* Subject and Email Body Form */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Subject <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Enter email subject..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Email Body <span className="text-red-500">*</span>
              </label>

              {/* Editor Toolbar */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-slate-600">
                <button
                  type="button"
                  onClick={() => setBody((b) => b + '**text**')}
                  className="p-1 hover:bg-white hover:rounded text-slate-700"
                  title="Bold"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setBody((b) => b + '*text*')}
                  className="p-1 hover:bg-white hover:rounded text-slate-700"
                  title="Italic"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setBody((b) => b + '<u>text</u>')}
                  className="p-1 hover:bg-white hover:rounded text-slate-700"
                  title="Underline"
                >
                  <Underline className="w-3.5 h-3.5" />
                </button>
                <div className="w-px h-3.5 bg-slate-300 mx-1" />
                <button
                  type="button"
                  onClick={() => setBody((b) => b + '\n- ')}
                  className="p-1 hover:bg-white hover:rounded text-slate-700"
                  title="Bullet List"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setBody((b) => b + '\n1. ')}
                  className="p-1 hover:bg-white hover:rounded text-slate-700"
                  title="Numbered List"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setBody((b) => b + ' [link](https://...)')}
                  className="p-1 hover:bg-white hover:rounded text-slate-700"
                  title="Insert Link"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                </button>
                <div className="w-px h-3.5 bg-slate-300 mx-1" />

                {/* Personalize dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowPersonalizeMenu(!showPersonalizeMenu)}
                    className="flex items-center gap-1 px-2 py-0.5 text-xs font-semibold hover:bg-white hover:rounded text-slate-700"
                  >
                    Personalize
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {showPersonalizeMenu && (
                    <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-30">
                      <button
                        type="button"
                        onClick={() => handleInsertPlaceholder('{{contact_name}}')}
                        className="w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50 font-mono"
                      >
                        {`{{contact_name}}`}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertPlaceholder('{{company_name}}')}
                        className="w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50 font-mono"
                      >
                        {`{{company_name}}`}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertPlaceholder('{{email}}')}
                        className="w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50 font-mono"
                      >
                        {`{{email}}`}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <textarea
              rows={8}
              placeholder="Your email content will appear here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full p-4 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white resize-y"
            />

            <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
              <span>Available placeholders:</span>
              <button
                type="button"
                onClick={() => handleInsertPlaceholder('{{contact_name}}')}
                className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-mono hover:bg-blue-100"
              >
                {`{{contact_name}}`}
              </button>
              <button
                type="button"
                onClick={() => handleInsertPlaceholder('{{company_name}}')}
                className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-mono hover:bg-blue-100"
              >
                {`{{company_name}}`}
              </button>
              <button
                type="button"
                onClick={() => handleInsertPlaceholder('{{email}}')}
                className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-mono hover:bg-blue-100"
              >
                {`{{email}}`}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setNotification({ type: 'success', message: 'Email draft saved.' })}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl transition-colors shadow-2xs cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            Save as Draft
          </button>

          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl transition-colors shadow-2xs cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            Preview Email
          </button>

          <button
            type="button"
            onClick={handleSendEmails}
            disabled={isSending}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Emails
              </>
            )}
          </button>
        </div>
      </div>

      {/* Recent Email Activity Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200">
          <h3 className="font-bold text-slate-900 text-base">Recent Email Activity</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Company Name</th>
                <th className="py-3.5 px-6">Email</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Sent On</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No outreach emails sent yet. Select recipients above to send your first email.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-4 px-6 font-semibold text-blue-600 hover:underline cursor-pointer">
                    {log.company_name}
                  </td>
                  <td className="py-4 px-6 text-slate-600 font-mono text-xs">
                    {log.email}
                  </td>
                  <td className="py-4 px-6">
                    {log.status === 'Sent' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Sent
                      </span>
                    )}
                    {log.status === 'In Progress' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        In Progress
                      </span>
                    )}
                    {log.status === 'Completed' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Completed
                      </span>
                    )}
                    {log.status === 'Failed' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        Failed
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-slate-500 text-xs">
                    {log.sent_on}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button className="text-slate-400 hover:text-slate-600 p-1 rounded-md">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Email Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl p-6">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-600" />
                Email Preview (Sample Recipient: Acme Corp)
              </h3>
              <button
                onClick={() => setShowPreview(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="text-xs text-slate-400 font-semibold mb-1">To:</div>
                <div className="text-slate-800 font-mono text-xs">john@acme.com (Acme Corp)</div>
                <div className="text-xs text-slate-400 font-semibold mt-2 mb-1">Subject:</div>
                <div className="text-slate-900 font-semibold">
                  {subject
                    .replace(/{{company_name}}/g, 'Acme Corp')
                    .replace(/{{contact_name}}/g, 'John Doe')
                    .replace(/{{email}}/g, 'john@acme.com') || '(No Subject)'}
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 whitespace-pre-wrap text-slate-700 leading-relaxed font-sans min-h-[160px]">
                {body
                  .replace(/{{company_name}}/g, 'Acme Corp')
                  .replace(/{{contact_name}}/g, 'John Doe')
                  .replace(/{{email}}/g, 'john@acme.com') || '(No Body Content)'}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowPreview(false)}
                className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
