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

interface SuccessRateChartProps {
    batches: Array<{ batchName: string; successRate: number; total: number }>;
}

export function SuccessRateChart({ batches }: SuccessRateChartProps) {
    const data = {
        labels: batches.map(b => b.batchName),
        datasets: [{
            label: 'Success Rate %',
            data: batches.map(b => b.successRate),
            backgroundColor: batches.map(b =>
                b.successRate >= 95 ? '#10b981' : b.successRate >= 80 ? '#f59e0b' : '#ef4444'
            ),
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
                            `Success Rate: ${context.parsed.y}%`,
                            `Total Emails: ${batch.total}`
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
                max: 100,
                ticks: {
                    callback: function (value: any) {
                        return value + '%';
                    }
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Success Rate by Batch</h3>
            <div style={{ height: '300px' }}>
                <Bar data={data} options={options} />
            </div>
        </div>
    );
}
