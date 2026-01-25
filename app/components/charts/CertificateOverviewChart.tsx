'use client';

import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface CertificateOverviewChartProps {
    totalCertificates: number;
    totalBatches: number;
}

export function CertificateOverviewChart({ totalCertificates, totalBatches }: CertificateOverviewChartProps) {
    const avgPerBatch = totalBatches > 0 ? Math.round(totalCertificates / totalBatches) : 0;

    const data = {
        labels: ['Total Certificates', 'Total Batches', 'Avg per Batch'],
        datasets: [{
            data: [totalCertificates, totalBatches, avgPerBatch],
            backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'],
            borderWidth: 2,
            borderColor: '#ffffff'
        }]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: {
                    padding: 15,
                    font: {
                        size: 12
                    }
                }
            },
            tooltip: {
                callbacks: {
                    label: function (context: any) {
                        const label = context.label || '';
                        const value = context.parsed || 0;
                        return `${label}: ${value}`;
                    }
                }
            }
        }
    };

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Certificate Overview</h3>
            <div className="flex justify-center">
                <div style={{ maxWidth: '300px', width: '100%' }}>
                    <Doughnut data={data} options={options} />
                </div>
            </div>
            <div className="mt-4 text-center text-sm text-gray-600">
                <p>Average: {avgPerBatch} certificates per batch</p>
            </div>
        </div>
    );
}
