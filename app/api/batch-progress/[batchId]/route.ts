import { NextRequest } from 'next/server';
import prisma from '@/app/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ batchId: string }> }
) {
    const { batchId } = await params;

    // Create a readable stream for SSE
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            const sendUpdate = async () => {
                try {
                    // Fetch batch progress from database
                    const batch = await prisma.batch.findUnique({
                        where: { id: batchId },
                        select: {
                            id: true,
                            totalEmails: true,
                            emailsSent: true,
                            status: true,
                            _count: {
                                select: {
                                    certificates: true,
                                },
                            },
                        },
                    });

                    if (!batch) {
                        controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify({ error: 'Batch not found' })}\n\n`)
                        );
                        controller.close();
                        return;
                    }

                    // Calculate progress
                    const total = batch.totalEmails;
                    const completed = batch.emailsSent || 0;
                    const failed = batch._count.certificates - completed;
                    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

                    const progressData = {
                        batchId: batch.id,
                        total,
                        completed,
                        failed,
                        percentage,
                        status: batch.status,
                    };

                    // Send progress update
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify(progressData)}\n\n`)
                    );

                    // Close stream if batch is complete
                    if (batch.status === 'completed' || batch.status === 'failed') {
                        controller.close();
                    }
                } catch (error) {
                    console.error('SSE Error:', error);
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ error: 'Failed to fetch progress' })}\n\n`)
                    );
                    controller.close();
                }
            };

            // Send initial update
            await sendUpdate();

            // Send updates every 2 seconds
            const interval = setInterval(async () => {
                await sendUpdate();
            }, 2000);

            // Cleanup on close
            request.signal.addEventListener('abort', () => {
                clearInterval(interval);
                controller.close();
            });
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
