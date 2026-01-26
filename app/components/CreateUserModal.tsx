'use client';

import { useState } from 'react';

interface CreateUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUserCreated: () => void;
}

export default function CreateUserModal({ isOpen, onClose, onUserCreated }: CreateUserModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        organization: '',
        phone: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [createdUser, setCreatedUser] = useState<{
        email: string;
        password: string;
    } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to create user');
            }

            const data = await response.json();

            // Show generated credentials
            setCreatedUser({
                email: data.user.email,
                password: data.generatedPassword,
            });

            // Reset form
            setFormData({
                name: '',
                email: '',
                organization: '',
                phone: '',
            });
        } catch (err) {
            console.error('Error creating user:', err);
            setError(err instanceof Error ? err.message : 'Failed to create user');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setCreatedUser(null);
        setError(null);
        setFormData({
            name: '',
            email: '',
            organization: '',
            phone: '',
        });
        onClose();
        if (createdUser) {
            onUserCreated();
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h2 className="text-2xl font-bold mb-4">
                    {createdUser ? 'User Created Successfully' : 'Create New User'}
                </h2>

                {createdUser ? (
                    <div className="space-y-4">
                        <div className="bg-green-50 border border-green-200 rounded p-4">
                            <p className="text-green-800 font-medium mb-2">
                                User created successfully! Share these credentials with the user:
                            </p>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={createdUser.email}
                                        readOnly
                                        className="flex-1 p-2 border rounded bg-gray-50"
                                    />
                                    <button
                                        onClick={() => copyToClipboard(createdUser.email)}
                                        className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Generated Password
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={createdUser.password}
                                        readOnly
                                        className="flex-1 p-2 border rounded bg-gray-50 font-mono"
                                    />
                                    <button
                                        onClick={() => copyToClipboard(createdUser.password)}
                                        className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                            <p className="text-yellow-800 text-sm">
                                <strong>Important:</strong> Make sure to copy and share these credentials with the
                                user. The password will not be shown again.
                            </p>
                        </div>

                        <button
                            onClick={handleClose}
                            className="w-full bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                        >
                            Close
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded p-4">
                                <p className="text-red-800">{error}</p>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="John Doe"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="john@example.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
                            <input
                                type="text"
                                value={formData.organization}
                                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Acme Corp"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="+1234567890"
                            />
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded p-4">
                            <p className="text-blue-800 text-sm">
                                A random password will be generated automatically. You'll be able to copy and share
                                it with the user after creation.
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="flex-1 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
                            >
                                {loading ? 'Creating...' : 'Create User'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
