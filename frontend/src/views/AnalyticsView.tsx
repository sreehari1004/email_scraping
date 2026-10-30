import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Users, 
  Mail, 
  Phone, 
  TrendingUp, 
  Calendar,
  Loader2
} from 'lucide-react';
import type { AnalyticsData } from '../types';
import { Header } from '../components/Header';

export const AnalyticsView: React.FC = () => {
  const [period, setPeriod] = useState('Last 7 days');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/analytics?period=${encodeURIComponent(period)}`);
        if (!res.ok) return;
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [period]);

  if (loading && !data) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const kpis = data?.kpis || {
    total_websites: { value: 0, trend: '0% vs. previous 7 days' },
    unique_contacts: { value: 0, trend: '0% vs. previous 7 days' },
    email_addresses: { value: 0, trend: '0% vs. previous 7 days' },
    phone_numbers: { value: 0, trend: '0% vs. previous 7 days' },
  };

  const status = data?.website_status || {
    total: 0,
    completed: { count: 0, percent: 0 },
    failed: { count: 0, percent: 0 },
    partial: { count: 0, percent: 0 },
    in_progress: { count: 0, percent: 0 },
  };

  const activity = data?.activity_chart || [];

  // SVG Donut Calculations
  const radius = 64;
  const strokeWidth = 18;
  const circumference = 2 * Math.PI * radius;
  
  const cPct = status.completed.percent / 100;
  const fPct = status.failed.percent / 100;
  const pPct = status.partial.percent / 100;
  const iPct = status.in_progress.percent / 100;

  const cOffset = 0;
  const fOffset = circumference * cPct;
  const pOffset = fOffset + circumference * fPct;
  const iOffset = pOffset + circumference * pPct;

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <Header
        title="Analytics"
        subtitle="Track your scraping performance and results."
      >
        <div className="relative">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="appearance-none bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs focus:outline-hidden"
          >
            <option value="Today">Today</option>
            <option value="Last 7 days">Last 7 days</option>
            <option value="Last 30 days">Last 30 days</option>
            <option value="Custom date range">Custom date range</option>
          </select>
          <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </Header>

      {/* 4 Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Websites Scraped */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-500">Total Websites Scraped</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mb-2">{kpis.total_websites.value}</div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{kpis.total_websites.trend}</span>
          </div>
        </div>

        {/* Unique Contacts Found */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-500">Unique Contacts Found</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mb-2">{kpis.unique_contacts.value}</div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{kpis.unique_contacts.trend}</span>
          </div>
        </div>

        {/* Email Addresses */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-500">Email Addresses</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mb-2">{kpis.email_addresses.value}</div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{kpis.email_addresses.trend}</span>
          </div>
        </div>

        {/* Phone Numbers */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Phone className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-500">Phone Numbers</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mb-2">{kpis.phone_numbers.value}</div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{kpis.phone_numbers.trend}</span>
          </div>
        </div>
      </div>

      {/* Two Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart 1: Website Status (Donut) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <h3 className="font-bold text-slate-900 text-base mb-6">Website Status</h3>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 py-4">
            {/* Donut graphic */}
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                {/* Background Ring */}
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="transparent"
                  stroke="#f1f5f9"
                  strokeWidth={strokeWidth}
                />
                {status.total > 0 && (
                  <>
                    {/* Completed (Emerald) */}
                    <circle
                      cx="80"
                      cy="80"
                      r={radius}
                      fill="transparent"
                      stroke="#10b981"
                      strokeWidth={strokeWidth}
                      strokeDasharray={`${circumference * cPct} ${circumference}`}
                      strokeDashoffset={-cOffset}
                      strokeLinecap="round"
                    />
                    {/* Failed (Red) */}
                    <circle
                      cx="80"
                      cy="80"
                      r={radius}
                      fill="transparent"
                      stroke="#ef4444"
                      strokeWidth={strokeWidth}
                      strokeDasharray={`${circumference * fPct} ${circumference}`}
                      strokeDashoffset={-fOffset}
                      strokeLinecap="round"
                    />
                    {/* Partial (Orange) */}
                    <circle
                      cx="80"
                      cy="80"
                      r={radius}
                      fill="transparent"
                      stroke="#f59e0b"
                      strokeWidth={strokeWidth}
                      strokeDasharray={`${circumference * pPct} ${circumference}`}
                      strokeDashoffset={-pOffset}
                      strokeLinecap="round"
                    />
                    {/* In Progress (Blue) */}
                    <circle
                      cx="80"
                      cy="80"
                      r={radius}
                      fill="transparent"
                      stroke="#3b82f6"
                      strokeWidth={strokeWidth}
                      strokeDasharray={`${circumference * iPct} ${circumference}`}
                      strokeDashoffset={-iOffset}
                      strokeLinecap="round"
                    />
                  </>
                )}
              </svg>

              {/* Center Stat */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-extrabold text-slate-900">{status.total}</span>
                <span className="text-xs text-slate-500 font-medium">Total Websites</span>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-3 w-48 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-slate-700">Completed</span>
                </div>
                <span className="font-semibold text-slate-900">
                  {status.completed.count} ({status.completed.percent}%)
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-slate-700">Failed</span>
                </div>
                <span className="font-semibold text-slate-900">
                  {status.failed.count} ({status.failed.percent}%)
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-slate-700">Partial</span>
                </div>
                <span className="font-semibold text-slate-900">
                  {status.partial.count} ({status.partial.percent}%)
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-slate-700">In Progress</span>
                </div>
                <span className="font-semibold text-slate-900">
                  {status.in_progress.count} ({status.in_progress.percent}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Chart 2: Scraping Activity (Bar Chart) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Scraping Activity</h3>
            <span className="text-xs text-slate-500">Websites Processed</span>
          </div>

          <div className="pt-6 pb-2">
            <div className="h-48 flex items-end justify-between gap-3 px-2 border-b border-slate-200 relative">
              {/* Horizontal gridlines */}
              <div className="absolute inset-x-0 top-0 border-b border-dashed border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                <span>80</span>
              </div>
              <div className="absolute inset-x-0 top-1/4 border-b border-dashed border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                <span>60</span>
              </div>
              <div className="absolute inset-x-0 top-2/4 border-b border-dashed border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                <span>40</span>
              </div>
              <div className="absolute inset-x-0 top-3/4 border-b border-dashed border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                <span>20</span>
              </div>

              {/* Bars */}
              {activity.map((bar) => {
                const heightPercent = Math.min(100, Math.round((bar.count / 80) * 100));
                return (
                  <div key={bar.date} className="flex-1 flex flex-col items-center gap-2 group relative z-10">
                    {/* Tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap">
                      {bar.count} websites
                    </div>

                    <div
                      className="w-full bg-blue-500 hover:bg-blue-600 rounded-t-md transition-all duration-300"
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                );
              })}
            </div>

            {/* X-axis labels */}
            <div className="flex justify-between items-center text-xs text-slate-500 pt-3 px-2">
              {activity.map((bar) => (
                <span key={bar.date} className="flex-1 text-center font-medium">
                  {bar.date}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
