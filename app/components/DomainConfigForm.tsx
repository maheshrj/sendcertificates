'use client';

import { useState, useEffect } from 'react';
import { FeedbackDialog } from '@/app/components/FeedbackDialog';
import { ClipboardIcon, CheckIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

interface DNSRecord {
  type: string;
  name: string;
  value: string;
  ttl?: string;
}

interface ValidationErrors {
  customDomain?: string;
  customEmail?: string;
}

export default function DomainConfigForm() {
  const [domainConfig, setDomainConfig] = useState({
    customDomain: '',
    customEmail: '',
    isVerified: false,
    dkimRecords: null as string[] | null,
  });
  const [dnsRecords, setDnsRecords] = useState<DNSRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dialogMessage, setDialogMessage] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState({
    customDomain: false,
    customEmail: false,
  });

  useEffect(() => {
    const fetchDomainConfig = async () => {
      try {
        const response = await fetch('/api/domain-config');
        if (!response.ok) {
          throw new Error('Failed to fetch domain configuration');
        }
        const data = await response.json();
        setDomainConfig({
          customDomain: data?.customDomain || '',
          customEmail: data?.customEmail || '',
          isVerified: data?.isVerified || false,
          dkimRecords: data?.dkimRecords || null,
        });
        if (data?.dkimRecords) {
          generateDNSRecords(data.customDomain, data.dkimRecords);
        }
      } catch (error) {
        console.error('Error fetching domain configuration:', error);
        setDialogMessage(
          error instanceof Error ? error.message : 'Failed to load domain configuration.'
        );
        setIsDialogOpen(true);
      }
    };

    fetchDomainConfig();
  }, []);

  const generateDNSRecords = (domain: string, dkimTokens: string[]) => {
    const records: DNSRecord[] = [
      // MX Record
      {
        type: 'MX',
        name: domain,
        value: `10 inbound-smtp.${process.env.NEXT_PUBLIC_AWS_REGION}.amazonaws.com`,
        ttl: '3600',
      },
      // TXT Record for SPF
      {
        type: 'TXT',
        name: domain,
        value: 'v=spf1 include:amazonses.com ~all',
        ttl: '3600',
      },
      {
        type: 'TXT',
        name: `_dmarc.${domain}`,
        value: 'v=DMARC1; p=none;',
        ttl: '3600',
      },
    ];

    // DKIM Records
    dkimTokens.forEach((token) => {
      records.push({
        type: 'CNAME',
        name: `${token}._domainkey.${domain}`,
        value: `${token}.dkim.amazonses.com`,
        ttl: '3600',
      });
    });

    setDnsRecords(records);
  };

  const handleVerifyDomain = async () => {
    if (!validateForm()) {
      setDialogMessage('Please fix the validation errors before verifying.');
      setIsDialogOpen(true);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/verify-domain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          domain: domainConfig.customDomain,
          email: domainConfig.customEmail,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to verify domain');
      }

      const data = await response.json();

      // Update domainConfig with DKIM tokens
      setDomainConfig((prev) => ({
        ...prev,
        dkimRecords: data.dkimTokens,
      }));

      // Generate DNS records immediately after receiving DKIM tokens
      if (data.dkimTokens && Array.isArray(data.dkimTokens)) {
        generateDNSRecords(domainConfig.customDomain, data.dkimTokens);
      }

      setDialogMessage(
        'Domain verification initiated. Please add the DNS records shown below and then click "Check Verification Status" once they propagate.'
      );
      setIsDialogOpen(true);
    } catch (error) {
      console.error('Verification error:', error);
      setDialogMessage(error instanceof Error ? error.message : 'Failed to verify domain');
      setIsDialogOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckVerificationStatus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/verify-domain-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domain: domainConfig.customDomain }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to check verification status');
      }

      const data = await response.json();

      if (data.message && data.message.includes('successful')) {
        // Domain is verified
        setDomainConfig((prev) => ({ ...prev, isVerified: true }));
        setDialogMessage('Your domain has been successfully verified and is now marked as verified.');
      } else {
        // Not yet verified, show the status
        setDialogMessage(data.message || 'Domain not yet verified. Please try again later.');
      }
      setIsDialogOpen(true);
    } catch (error) {
      console.error('Check verification status error:', error);
      setDialogMessage(error instanceof Error ? error.message : 'Failed to check verification status');
      setIsDialogOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const validateDomain = (domain: string): string | undefined => {
    if (!domain) {
      return 'Domain is required';
    }
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      return 'Please enter a valid domain (e.g., certificates.example.com)';
    }
  };

  const validateEmail = (email: string): string | undefined => {
    if (!email) {
      return 'Email is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    const domainError = validateDomain(domainConfig.customDomain);
    if (domainError) newErrors.customDomain = domainError;

    const emailError = validateEmail(domainConfig.customEmail);
    if (emailError) newErrors.customEmail = emailError;

    setErrors(newErrors);
    setTouched({
      customDomain: true,
      customEmail: true,
    });

    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (field: keyof typeof touched) => {
    setTouched((prev) => ({ ...prev, [field]: true }));

    if (field === 'customDomain') {
      const error = validateDomain(domainConfig.customDomain);
      setErrors((prev) => ({ ...prev, customDomain: error }));
    } else if (field === 'customEmail') {
      const error = validateEmail(domainConfig.customEmail);
      setErrors((prev) => ({ ...prev, customEmail: error }));
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      setDialogMessage('Please fix the validation errors before saving.');
      setIsDialogOpen(true);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/domain-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(domainConfig),
      });

      if (!response.ok) {
        throw new Error('Failed to update domain configuration');
      }

      setDialogMessage('Domain configuration saved successfully!');
    } catch (error) {
      setDialogMessage(error instanceof Error ? error.message : 'Failed to save domain configuration');
    } finally {
      setIsLoading(false);
      setIsDialogOpen(true);
    }
  };

  const handleReset = async () => {
    if (
      !confirm('Are you sure you want to reset the domain configuration? This action cannot be undone.')
    ) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/domain-config', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to reset domain configuration');
      }

      // Reset local state
      setDomainConfig({
        customDomain: '',
        customEmail: '',
        isVerified: false,
        dkimRecords: null,
      });
      setDnsRecords([]);
      setDialogMessage('Domain configuration has been reset successfully.');
    } catch (error) {
      setDialogMessage(error instanceof Error ? error.message : 'Failed to reset domain configuration');
    } finally {
      setIsLoading(false);
      setIsDialogOpen(true);
    }
  };

  return (
    <div className="bg-white shadow-md rounded p-6 mt-6">
      <h2 className="text-lg font-semibold mb-4">Custom Domain Configuration</h2>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Custom Domain
        </label>
        <div className="relative">
          <input
            type="text"
            value={domainConfig.customDomain}
            onChange={(e) =>
              setDomainConfig((prev) => ({ ...prev, customDomain: e.target.value }))
            }
            onBlur={() => handleBlur('customDomain')}
            className={`w-full p-2 border rounded focus:outline-1 focus:outline-blue-500 ${
              touched.customDomain && errors.customDomain ? 'border-red-500 pr-10' : 'border-gray-300'
            }`}
            placeholder="e.g., certificates.yourdomain.com"
          />
          {touched.customDomain && errors.customDomain && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
            </div>
          )}
        </div>
        {touched.customDomain && errors.customDomain && (
          <p className="mt-1 text-sm text-red-600">{errors.customDomain}</p>
        )}
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Custom Email Address
        </label>
        <div className="relative">
          <input
            type="email"
            value={domainConfig.customEmail}
            onChange={(e) =>
              setDomainConfig((prev) => ({ ...prev, customEmail: e.target.value }))
            }
            onBlur={() => handleBlur('customEmail')}
            className={`w-full p-2 border rounded focus:outline-1 focus:outline-blue-500 ${
              touched.customEmail && errors.customEmail ? 'border-red-500 pr-10' : 'border-gray-300'
            }`}
            placeholder="e.g., certificates@yourdomain.com"
          />
          {touched.customEmail && errors.customEmail && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
            </div>
          )}
        </div>
        {touched.customEmail && errors.customEmail && (
          <p className="mt-1 text-sm text-red-600">{errors.customEmail}</p>
        )}
      </div>

      {dnsRecords.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Required DNS Records</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Value
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    TTL
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Copy
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {dnsRecords.map((record, index) => (
                  <tr key={index} className="text-sm">
                    <td className="px-4 py-2">{record.type}</td>
                    <td className="px-4 py-2 font-mono text-xs">{record.name}</td>
                    <td className="px-4 py-2 font-mono text-xs">{record.value}</td>
                    <td className="px-4 py-2">{record.ttl}</td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() =>
                          copyToClipboard(`${record.type} ${record.name} ${record.value}`, index)
                        }
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {copiedIndex === index ? (
                          <CheckIcon className="h-5 w-5" />
                        ) : (
                          <ClipboardIcon className="h-5 w-5" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Note: DNS changes may take up to 48 hours to propagate fully.
          </p>
        </div>
      )}

      <div className="flex justify-end space-x-4 mt-6">
        <button
          onClick={handleReset}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:bg-gray-400"
          disabled={isLoading || (!domainConfig.customDomain && !domainConfig.customEmail)}
        >
          {isLoading ? 'Resetting...' : 'Reset'}
        </button>

        <button
          onClick={handleVerifyDomain}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
          disabled={isLoading || !domainConfig.customDomain || !domainConfig.customEmail}
        >
          {isLoading ? 'Verifying...' : 'Verify Domain'}
        </button>

        {domainConfig.dkimRecords && !domainConfig.isVerified && (
          <button
            onClick={handleCheckVerificationStatus}
            className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 disabled:bg-gray-400"
            disabled={isLoading}
          >
            {isLoading ? 'Checking...' : 'Check Verification Status'}
          </button>
        )}

        <button
          onClick={handleSave}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-medium text-blue-800 mb-2">Setup Instructions:</h4>
        <ol className="list-decimal list-inside text-sm text-blue-700 space-y-2">
          <li>Enter your custom domain and email address.</li>
          <li>Click "Verify Domain" to generate the required DNS records.</li>
          <li>Add the DNS records to your domain provider’s DNS settings.</li>
          <li>Wait for DNS propagation (up to 48 hours).</li>
          <li>
            After propagation, click "Check Verification Status" to confirm and toggle the verified
            status.
          </li>
          <li>Once verified, your custom domain will be ready to use for sending certificates.</li>
        </ol>
      </div>

      <FeedbackDialog isOpen={isDialogOpen} onOpenChange={setIsDialogOpen} message={dialogMessage} />
    </div>
  );
}
