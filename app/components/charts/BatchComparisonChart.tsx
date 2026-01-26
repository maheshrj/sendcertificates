'use client';

import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface BatchComparisonChartProps {
    batches: Array<{ batchName: string; count: number; date: string }>;
}

export function BatchComparisonChart({ batches }: BatchComparisonChartProps) {
    const data = {
        labels: batches.map(b => b.batchName),
        datasets: [{
            label: 'Certificates Generated',
            data: batches.map(b => b.count),
            backgroundColor: '#3b82f6',
            borderRadius: 6,
            barThickness: 40
        }]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                callbacks: {
                    label: function (context: any) {
                        const batch = batches[context.dataIndex];
                        return [
                            `Certificates: ${context.parsed.y}`,
                            `Date: ${new Date(batch.date).toLocaleDateString()}`
                        ];
                    }
                },
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: 12
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    precision: 0
                },
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                }
            },
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    maxRotation: 45,
                    minRotation: 45
                }
            }
        }
    };

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Batch Comparison</h3>
            <div style={{ height: '300px' }}>
                <Bar data={data} options={options} />
            </div>
        </div>
    );
}
