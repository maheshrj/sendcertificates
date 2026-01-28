'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Download, Linkedin } from 'lucide-react';

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

  // Update meta tags dynamically for LinkedIn sharing
  useEffect(() => {
    if (certificate) {
      const recipientName = certificate?.data?.Name || certificate?.data?.name || certificate?.data?.recipientName || 'Certificate Holder';
      const courseName = certificate?.data?.Course || certificate?.data?.course || certificate?.data?.CourseName || certificate?.data?.courseName || '';
      const organizationName = certificate?.creator?.organization || certificate?.creator?.name || '';
      const issueDate = new Date(certificate?.createdAt || Date.now());
      const formattedDate = issueDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

      let linkedInDescription = `I'm happy to share that I have received`;
      if (courseName) {
        linkedInDescription += ` ${courseName}`;
      }
      if (organizationName) {
        linkedInDescription += ` from ${organizationName}`;
      }
      linkedInDescription += ` on ${formattedDate}.`;

      const validationUrl = `${window.location.origin}/validate/${certificate.uniqueIdentifier}`;

      // Update document title
      document.title = `Certificate - ${recipientName}`;

      // Helper function to update or create meta tag
      const updateMetaTag = (property: string, content: string, isName = false) => {
        const attribute = isName ? 'name' : 'property';
        let element = document.querySelector(`meta[${attribute}="${property}"]`);
        if (!element) {
          element = document.createElement('meta');
          element.setAttribute(attribute, property);
          document.head.appendChild(element);
        }
        element.setAttribute('content', content);
      };

      // Update Open Graph tags
      updateMetaTag('og:title', `Certificate - ${recipientName}`);
      updateMetaTag('og:description', linkedInDescription);
      updateMetaTag('og:image', certificate.generatedImageUrl);
      updateMetaTag('og:url', validationUrl);
      updateMetaTag('og:type', 'website');

      // Update Twitter Card tags
      updateMetaTag('twitter:card', 'summary_large_image', true);
      updateMetaTag('twitter:title', `Certificate - ${recipientName}`, true);
      updateMetaTag('twitter:description', linkedInDescription, true);
      updateMetaTag('twitter:image', certificate.generatedImageUrl, true);
    }
  }, [certificate]);

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

  const handleLinkedInShare = () => {
    const validationUrl = `${window.location.origin}/validate/${certificate?.uniqueIdentifier}`;
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(validationUrl)}`;
    window.open(linkedInUrl, '_blank', 'width=600,height=600');
  };

  // Extract certificate details for meta tags
  const recipientName = certificate?.data?.Name || certificate?.data?.name || certificate?.data?.recipientName || 'Certificate Holder';
  const courseName = certificate?.data?.Course || certificate?.data?.course || certificate?.data?.CourseName || certificate?.data?.courseName || '';
  const organizationName = certificate?.creator?.organization || certificate?.creator?.name || '';
  const issueDate = new Date(certificate?.createdAt || Date.now());
  const formattedDate = issueDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

  // Build LinkedIn-friendly description
  let linkedInDescription = `I'm happy to share that I have received`;
  if (courseName) {
    linkedInDescription += ` ${courseName}`;
  }
  if (organizationName) {
    linkedInDescription += ` from ${organizationName}`;
  }
  linkedInDescription += ` on ${formattedDate}.`;

  const validationUrl = typeof window !== 'undefined' ? `${window.location.origin}/validate/${certificate?.uniqueIdentifier}` : '';

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-green-100 p-4 sm:p-5 md:p-6 rounded-lg mb-4 sm:mb-6 shadow-sm border border-green-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <div className="w-full sm:w-auto">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-green-800 mb-1 sm:mb-2 flex items-center gap-2">
                <span className="text-xl sm:text-2xl">✅</span> Valid Certificate
              </h1>
              <p className="text-green-700 text-xs sm:text-sm md:text-base">
                This certificate was issued on{' '}
                <span className="font-semibold">{new Date(certificate.createdAt).toLocaleDateString()}</span>
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                onClick={handleDownload}
                className="w-full sm:w-auto bg-green-700 hover:bg-green-800 text-white shadow-sm flex-shrink-0"
                size="lg"
              >
                <Download className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Download PDF
              </Button>
              <Button
                onClick={handleLinkedInShare}
                className="w-full sm:w-auto bg-[#0A66C2] hover:bg-[#004182] text-white shadow-sm flex-shrink-0"
                size="lg"
              >
                <Linkedin className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Share on LinkedIn
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-lg sm:shadow-xl rounded-lg sm:rounded-xl overflow-hidden border border-gray-100">
          <div className="p-4 sm:p-6 md:p-8">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 pb-2 border-b">Certificate Details</h2>
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2">
              <div className="col-span-1 sm:col-span-2">
                <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Certificate ID</p>
                <p className="font-mono text-xs sm:text-sm md:text-base bg-gray-50 p-3 rounded border border-gray-100 break-words overflow-wrap-anywhere">
                  {certificate.uniqueIdentifier}
                </p>
              </div>

              <div className="col-span-1">
                <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Issued By</p>
                <p className="font-medium text-gray-900 text-base sm:text-lg break-words">{certificate.creator.name}</p>
                {certificate.creator.organization && (
                  <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1 break-words">
                    {certificate.creator.organization}
                  </p>
                )}
              </div>

              {Object.entries(certificate.data).map(([key, value]) => (
                <div key={key} className="col-span-1">
                  <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">{key}</p>
                  <p className="font-medium text-gray-900 text-base sm:text-lg break-words overflow-wrap-anywhere">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 p-4 sm:p-6 md:p-8 border-t border-gray-200">
            <h3 className="text-xs sm:text-sm uppercase tracking-wider text-gray-500 font-semibold mb-3">Certificate Preview</h3>
            <div className="relative w-full aspect-[1.414] bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200">
              <Image
                src={certificate.generatedImageUrl}
                alt="Certificate"
                fill
                className="object-contain p-2"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 900px"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}