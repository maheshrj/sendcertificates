import { NextResponse } from 'next/server';
import { getSESEmailCount } from '@/app/lib/ses-rate-limiter';

/**
 * API endpoint to get current SES quota usage
 * Returns current email counts and limits
 */
export async function GET() {
    try {
        const quotaInfo = await getSESEmailCount();

        const percentagePerSecond = (quotaInfo.perSecond / quotaInfo.perSecondLimit) * 100;
        const percentagePerDay = (quotaInfo.perDay / quotaInfo.perDayLimit) * 100;

        return NextResponse.json({
            current: {
                perSecond: quotaInfo.perSecond,
                perDay: quotaInfo.perDay,
            },
            limits: {
                perSecond: quotaInfo.perSecondLimit,
                perDay: quotaInfo.perDayLimit,
            },
            usage: {
                perSecondPercentage: Math.round(percentagePerSecond),
                perDayPercentage: Math.round(percentagePerDay),
            },
            remaining: {
                perSecond: quotaInfo.perSecondLimit - quotaInfo.perSecond,
                perDay: quotaInfo.perDayLimit - quotaInfo.perDay,
            },
            status: percentagePerDay > 90 ? 'critical' : percentagePerDay > 75 ? 'warning' : 'ok',
        });
    } catch (error) {
        console.error('Error fetching SES quota:', error);
        return NextResponse.json(
            { error: 'Failed to fetch SES quota' },
            { status: 500 }
        );
    }
}
