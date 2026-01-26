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
                            name: true,
                            progress: true,
                            _count: {
                                select: {
                                    certificates: true,
                                    failedCertificates: true,
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
                    const total = batch._count.certificates + batch._count.failedCertificates;
                    const completed = batch._count.certificates;
                    const failed = batch._count.failedCertificates;
                    const percentage = batch.progress;

                    // Determine status based on progress
                    let status = 'processing';
                    if (percentage >= 100) {
                        status = failed > 0 ? 'completed_with_errors' : 'completed';
                    } else if (percentage === 0 && total === 0) {
                        status = 'pending';
                    }

                    const progressData = {
                        batchId: batch.id,
                        total,
                        completed,
                        failed,
                        percentage,
                        status,
                    };

                    // Send progress update
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify(progressData)}\n\n`)
                    );

                    // Close stream if batch is complete
                    if (status === 'completed' || status === 'completed_with_errors') {
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
