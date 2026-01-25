'use client';

import { useState, useEffect } from 'react';
import { BatchTimelineChart } from '@/app/components/charts/BatchTimelineChart';
import { CertificateOverviewChart } from '@/app/components/charts/CertificateOverviewChart';
import { BatchComparisonChart } from '@/app/components/charts/BatchComparisonChart';

interface DomainStats {
  delivered: number;
  spam: number;
}

interface Engagement {
  sent: number;
  averageReadRate: string;
  averageDeleteRate: string;
}

interface AnalyticsData {
  totalBatches: number;
  totalCertificates: number;
  totalEmailsSent: number;
  domainStats: DomainStats | null;
  engagement: Engagement | null;
  error?: string;
}

interface ChartData {
  overview: { totalCertificates: number; totalBatches: number };
  timeline: { labels: string[]; data: number[] };
  batchCertificateCounts: Array<{ batchName: string; count: number; date: string }>;
}

export function AnalyticsSummary() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7' | '30' | '90' | 'all'>('30');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch('/api/analytics', { credentials: 'include' });
        const json = await res.json();

        if (res.ok) {
          setData(json);
        } else {
          setData({
            error: json.error,
            totalBatches: 0,
            totalCertificates: 0,
            totalEmailsSent: 0,
            domainStats: null,
            engagement: null
          });
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
        setData({
          error: 'Failed to fetch analytics',
          totalBatches: 0,
          totalCertificates: 0,
          totalEmailsSent: 0,
          domainStats: null,
          engagement: null
        });
      } finally {
        setLoading(false);
      }
    };

    const fetchChartData = async () => {
      try {
        const res = await fetch(`/api/analytics/charts-data?days=${dateRange}`, { credentials: 'include' });
        if (res.ok) {
          const json = await res.json();
          setChartData(json);
        }
      } catch (error) {
        console.error('Failed to fetch chart data:', error);
      } finally {
        setChartsLoading(false);
      }
    };

    fetchAnalytics();
    fetchChartData();
  }, [dateRange]);

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Your Analytics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border rounded p-4 text-center">
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data?.error) {
    return (
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <p className="text-red-600">{data.error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Your Analytics</h2>

      {/* Basic Analytics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="border rounded p-4 text-center">
          <h3 className="text-lg font-semibold">Total Batches</h3>
          <p className="text-2xl mt-2">{data?.totalBatches ?? 0}</p>
        </div>
        <div className="border rounded p-4 text-center">
          <h3 className="text-lg font-semibold">Total Certificates</h3>
          <p className="text-2xl mt-2">{data?.totalCertificates ?? 0}</p>
        </div>
        <div className="border rounded p-4 text-center">
          <h3 className="text-lg font-semibold">Total Emails Sent</h3>
          <p className="text-2xl mt-2">{data?.totalEmailsSent ?? 0}</p>
        </div>
      </div>

      {/* Charts Section */}
      {!chartsLoading && chartData && chartData.timeline.labels.length > 0 && (
        <div className="space-y-6 mb-6">
          {/* Date Range Filter */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Performance Trends</h3>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Time Range:</label>
              <select
                value={dateRange}
                onChange={(e) => {
                  setDateRange(e.target.value as '7' | '30' | '90' | 'all');
                  setChartsLoading(true);
                }}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CertificateOverviewChart
              totalCertificates={chartData.overview.totalCertificates}
              totalBatches={chartData.overview.totalBatches}
            />
            <BatchComparisonChart batches={chartData.batchCertificateCounts} />
          </div>

          {/* Timeline Chart - Full Width */}
          <BatchTimelineChart labels={chartData.timeline.labels} data={chartData.timeline.data} />
        </div>
      )}

      {/* Domain-level Stats (if any) */}
      {data?.domainStats && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">VDM Domain-Level Stats (7 days)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border rounded p-4 text-center">
              <h4 className="text-sm font-medium">Delivered</h4>
              <p className="text-lg mt-2">{data.domainStats.delivered}</p>
            </div>
            <div className="border rounded p-4 text-center">
              <h4 className="text-sm font-medium">Spam</h4>
              <p className="text-lg mt-2">{data.domainStats.spam}</p>
            </div>
          </div>
          <p className="text-sm mt-2 text-gray-600">
            Additional metrics like complaints or bounces are not provided at this level.
          </p>
        </div>
      )}

      {/* Engagement Metrics (if any) */}
      {data?.engagement && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Engagement Metrics (7 days)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="border rounded p-4 text-center">
              <h4 className="text-sm font-medium">Sent (Inbox+Spam)</h4>
              <p className="text-lg mt-2">{data.engagement.sent}</p>
            </div>
            <div className="border rounded p-4 text-center">
              <h4 className="text-sm font-medium">Avg Read Rate</h4>
              <p className="text-lg mt-2">{data.engagement.averageReadRate}</p>
            </div>
            <div className="border rounded p-4 text-center">
              <h4 className="text-sm font-medium">Avg Delete Rate</h4>
              <p className="text-lg mt-2">{data.engagement.averageDeleteRate}</p>
            </div>
          </div>
          <p className="text-sm mt-2 text-gray-600">
            Read rate and delete rate are proxies for engagement derived from campaign-level data.
          </p>
        </div>
      )}
    </div>
  );
}
