'use client';

import { useState, useEffect } from 'react';

interface User {
    id: string;
    email: string;
    name: string;
    emailRateLimit: number;
    emailDailyLimit: number;
    createdAt: string;
}

export default function AdminRateLimitsPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingUser, setEditingUser] = useState<string | null>(null);
    const [editValues, setEditValues] = useState<{ [key: string]: { perSecond: number; perDay: number } }>({});

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/user-rate-limits');
            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }
            const data = await response.json();
            setUsers(data.users);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch users:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    const startEditing = (user: User) => {
        setEditingUser(user.id);
        setEditValues({
            ...editValues,
            [user.id]: {
                perSecond: user.emailRateLimit,
                perDay: user.emailDailyLimit,
            },
        });
    };

    const cancelEditing = () => {
        setEditingUser(null);
    };

    const saveRateLimit = async (userId: string) => {
        try {
            const values = editValues[userId];
            const response = await fetch('/api/admin/user-rate-limits', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetUserId: userId,
                    emailRateLimit: values.perSecond,
                    emailDailyLimit: values.perDay,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update rate limit');
            }

            setEditingUser(null);
            fetchUsers(); // Refresh list
        } catch (err) {
            console.error('Failed to update rate limit:', err);
            alert(err instanceof Error ? err.message : 'Failed to update rate limit');
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold mb-6">User Rate Limits</h1>
                <div className="animate-pulse">
                    <div className="h-10 bg-gray-200 rounded mb-4"></div>
                    <div className="h-64 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold mb-6">User Rate Limits</h1>
                <div className="bg-red-50 border border-red-200 rounded p-4">
                    <p className="text-red-800">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">User Rate Limits</h1>
                <button
                    onClick={fetchUsers}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                    Refresh
                </button>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-6">
                <p className="text-sm text-yellow-800">
                    <strong>AWS SES Global Limits:</strong> 50,000 emails/day, 14 emails/sec maximum
                </p>
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                User
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Email
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Per Second
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Per Day
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500">{user.email}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {editingUser === user.id ? (
                                        <input
                                            type="number"
                                            min="1"
                                            max="14"
                                            value={editValues[user.id]?.perSecond || user.emailRateLimit}
                                            onChange={(e) =>
                                                setEditValues({
                                                    ...editValues,
                                                    [user.id]: {
                                                        ...editValues[user.id],
                                                        perSecond: parseInt(e.target.value) || 1,
                                                    },
                                                })
                                            }
                                            className="border rounded px-2 py-1 w-20"
                                        />
                                    ) : (
                                        <div className="text-sm text-gray-900">{user.emailRateLimit} /sec</div>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {editingUser === user.id ? (
                                        <input
                                            type="number"
                                            min="1"
                                            value={editValues[user.id]?.perDay || user.emailDailyLimit}
                                            onChange={(e) =>
                                                setEditValues({
                                                    ...editValues,
                                                    [user.id]: {
                                                        ...editValues[user.id],
                                                        perDay: parseInt(e.target.value) || 1,
                                                    },
                                                })
                                            }
                                            className="border rounded px-2 py-1 w-28"
                                        />
                                    ) : (
                                        <div className="text-sm text-gray-900">
                                            {user.emailDailyLimit.toLocaleString()} /day
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    {editingUser === user.id ? (
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => saveRateLimit(user.id)}
                                                className="text-green-600 hover:text-green-800 font-medium"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={cancelEditing}
                                                className="text-gray-600 hover:text-gray-800 font-medium"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => startEditing(user)}
                                            className="text-blue-600 hover:text-blue-800 font-medium"
                                        >
                                            Edit
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {users.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-gray-500">No users found</p>
                </div>
            )}
        </div>
    );
}
