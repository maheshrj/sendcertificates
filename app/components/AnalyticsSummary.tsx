'use client';

import { useState, useEffect } from 'react';

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

export function AnalyticsSummary() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

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

    fetchAnalytics();
  }, []);

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
