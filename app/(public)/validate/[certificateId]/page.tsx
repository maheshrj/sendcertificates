'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export type Certificate = {
  id: string;
  templateId: string;
  uniqueIdentifier: string;
  data: Record<string, string>;
  generatedImageUrl: string;
  createdAt: Date;
  creator: {
    name: string;
    organization: string | null;
    email: string;
  };
};

export default function ValidateCertificatePage() {
  const { certificateId } = useParams();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCertificate = async () => {
      try {
        const response = await fetch(`/api/validate/${certificateId}`);
        if (!response.ok) {
          throw new Error('Certificate not found');
        }
        const data = await response.json();
        setCertificate(data);
      } catch (err) {
        setError('Invalid or expired certificate');
      } finally {
        setLoading(false);
      }
    };

    fetchCertificate();
  }, [certificateId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Validating certificate...</p>
        </div>
      </div>
    );
  }

  if (error || !certificate || !certificate.creator) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-red-600">
          <h1 className="text-2xl font-bold mb-4">❌ Invalid Certificate</h1>
          <p>{error || 'Certificate not found'}</p>
        </div>
      </div>
    );
  }

  const handleDownload = () => {
    if (certificate?.generatedImageUrl) {
      window.open(certificate.generatedImageUrl, '_blank');
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-green-100 p-4 rounded-lg mb-8">
        <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-green-800 mb-2">
                ✅ Valid Certificate
              </h1>
              <p className="text-green-700">
                This certificate was issued on{' '}
                {new Date(certificate.createdAt).toLocaleDateString()}
              </p>
            </div>
            <Button
              onClick={handleDownload}
              className="bg-green-700 hover:bg-green-800 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
        

        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Certificate Details</h2>
            <div className="grid gap-4">
              <div>
                <p className="text-gray-600">Certificate ID</p>
                <p className="font-medium">{certificate.uniqueIdentifier}</p>
              </div>

              <div>
                <p className="text-gray-600">Issued By</p>
                <p className="font-medium">{certificate.creator.name}</p>
                {certificate.creator.organization && (
                  <p className="text-sm text-gray-500">
                    {certificate.creator.organization}
                  </p>
                )}
              </div>
              
              {Object.entries(certificate.data).map(([key, value]) => (
                <div key={key}>
                  <p className="text-gray-600">{key}</p>
                  <p className="font-medium">{value}</p>
                </div>
              ))}
            </div>
          </div>
          
          <div className="border-t border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Certificate Image</h3>
            <div className="relative w-full aspect-[1.414] bg-gray-100 rounded-lg overflow-hidden">
              <Image
                src={certificate.generatedImageUrl}
                alt="Certificate"
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}