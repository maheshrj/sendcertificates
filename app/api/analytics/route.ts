import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import jwt from 'jsonwebtoken';
import { 
  SESv2Client, 
  GetDomainStatisticsReportCommand, 
  ListDomainDeliverabilityCampaignsCommand, 
  GetDomainDeliverabilityCampaignCommand, 
  NotFoundException,
  GetDeliverabilityDashboardOptionsCommand
} from '@aws-sdk/client-sesv2';

const JWT_SECRET = process.env.JWT_SECRET!;

function getUserIdFromRequest(request: Request): string | null {
    const token = request.headers
    .get('cookie')
    ?.split('; ')
    .find((c) => c.startsWith('token='))
    ?.split('=')[1];
    
    if (!token) return null;
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        return decoded.userId;
    } catch {
        return null;
    }
}

export async function GET(request: Request) {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Basic analytics
  const [totalBatches, totalCertificates, certificates] = await Promise.all([
    prisma.batch.count({ where: { creatorId: userId } }),
    prisma.certificate.count({ where: { creatorId: userId } }),
    prisma.certificate.findMany({ where: { creatorId: userId }, select: { data: true } })
  ]);

  const totalEmailsSent = certificates.reduce((count: number, cert: { data: unknown }) => {
    const email = (cert.data as Record<string, string>)?.Email;
    return email ? count + 1 : count;
  }, 0);

  const emailConfig = await prisma.emailConfig.findUnique({
    where: { userId }
  });

  const sesv2 = new SESv2Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
    },
  });

  // Check dashboard status early
  try {
    const dashboardOptions = await sesv2.send(new GetDeliverabilityDashboardOptionsCommand({}));
    console.log(dashboardOptions);
    if (!dashboardOptions.DashboardEnabled) {
      return NextResponse.json({
        totalBatches,
        totalCertificates,
        totalEmailsSent,
        domainStats: null,
        engagement: null
      });
    }
  } catch (error) {
    console.error('Error checking dashboard status:', error);
    return NextResponse.json({
      totalBatches,
      totalCertificates,
      totalEmailsSent,
      domainStats: null,
      engagement: null
    });
  }

  // If no verified domain, return basic stats only
  if (!emailConfig?.customDomain || !emailConfig.isVerified) {
    return NextResponse.json({
      totalBatches,
      totalCertificates,
      totalEmailsSent,
      domainStats: null,
      engagement: null
    });
  }

  const domain = emailConfig.customDomain;
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 7);

  let domainStats = null;
  let engagement = null;

  // Attempt fetching domain-level stats
  try {
    const domainStatsCommand = new GetDomainStatisticsReportCommand({
      Domain: domain,
      StartDate: startDate,
      EndDate: endDate,
    });
    const domainStatsResponse = await sesv2.send(domainStatsCommand);
    const vol = domainStatsResponse.OverallVolume?.VolumeStatistics || {};
    domainStats = {
      delivered: vol.InboxRawCount || 0,
      spam: vol.SpamRawCount || 0,
    };
  } catch (err: any) {
    if (err instanceof NotFoundException) {
      console.error('Deliverability Dashboard not enabled or no dashboard account found. Skipping domain stats.');
      domainStats = null; 
    } else {
      console.error('Error fetching domain stats:', err);
      domainStats = null;
    }
  }

  // Attempt fetching engagement (campaign) metrics
  if (domainStats !== null) {
    try {
      const listCommand = new ListDomainDeliverabilityCampaignsCommand({
        StartDate: startDate,
        EndDate: endDate,
        SubscribedDomain: domain
      });

      const listResponse = await sesv2.send(listCommand);
      const campaigns = listResponse.DomainDeliverabilityCampaigns || [];

      let totalInboxCount = 0;
      let totalSpamCount = 0;
      let totalReadRate = 0;
      let totalDeleteRate = 0;
      let campaignsWithData = 0;

      for (const c of campaigns) {
        if (!c.CampaignId) continue;

        const getCommand = new GetDomainDeliverabilityCampaignCommand({ CampaignId: c.CampaignId });
        const campaignData = await sesv2.send(getCommand);
        const camp = campaignData.DomainDeliverabilityCampaign;
        if (camp) {
          if (typeof camp.InboxCount === 'number') totalInboxCount += camp.InboxCount;
          if (typeof camp.SpamCount === 'number') totalSpamCount += camp.SpamCount;
          if (typeof camp.ReadRate === 'number') totalReadRate += camp.ReadRate;
          if (typeof camp.DeleteRate === 'number') totalDeleteRate += camp.DeleteRate;
          campaignsWithData++;
        }
      }

      if (campaignsWithData > 0) {
        const avgReadRate = (totalReadRate / campaignsWithData) * 100;
        const avgDeleteRate = (totalDeleteRate / campaignsWithData) * 100;
        engagement = {
          sent: totalInboxCount + totalSpamCount,
          averageReadRate: avgReadRate.toFixed(2) + '%',
          averageDeleteRate: avgDeleteRate.toFixed(2) + '%'
        };
      }
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.error('Deliverability Dashboard not enabled or no dashboard account found for campaigns. Skipping engagement metrics.');
        engagement = null;
      } else {
        console.error('Error fetching campaign engagement metrics:', err);
        engagement = null;
      }
    }
  }

  return NextResponse.json({
    totalBatches,
    totalCertificates,
    totalEmailsSent,
    domainStats,
    engagement,
  });
}