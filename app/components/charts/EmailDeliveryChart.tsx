'use client';

import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface EmailDeliveryChartProps {
    totalSent: number;
    totalFailed: number;
    totalPending: number;
}

export function EmailDeliveryChart({ totalSent, totalFailed, totalPending }: EmailDeliveryChartProps) {
    const data = {
        labels: ['Successfully Sent', 'Failed', 'Pending'],
        datasets: [{
            data: [totalSent, totalFailed, totalPending],
            backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
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
                        const total = totalSent + totalFailed + totalPending;
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                        return `${label}: ${value} (${percentage}%)`;
                    }
                }
            }
        }
    };

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Delivery Overview</h3>
            <div className="flex justify-center">
                <div style={{ maxWidth: '300px', width: '100%' }}>
                    <Doughnut data={data} options={options} />
                </div>
            </div>
        </div>
    );
}
