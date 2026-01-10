// generate/page.tsx
'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Template } from '@/app/types';
import { FeedbackDialog } from '@/app/components/FeedbackDialog';
import { LoadingOverlay } from '@/app/components/LoadingOverlay';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSearchParams } from 'next/navigation';



interface CsvSummary {
  columnNames: string[];
  totalRows: number;
  totalEmails: number;
  invalidEmails: string[];
}

function TemplateSelector({ onSelect }: { onSelect: (template: Template | null) => void }) {
  const searchParams = useSearchParams();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedId, setSelectedId] = useState<string>(''); // Add local state for selection

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch('/api/templates');
        if (!response.ok) throw new Error('Failed to fetch templates');
        const data: Template[] = await response.json();
        setTemplates(data);
        
        // Handle initial template selection from URL
        const templateId = searchParams.get('templateId');
        if (templateId) {
          const selectedTemplate = data.find(t => t.id === templateId);
          if (selectedTemplate) {
            setSelectedId(templateId);
            onSelect(selectedTemplate);
          }
        }
      } catch (error) {
        console.error('Error fetching templates:', error);
      }
    };
    fetchTemplates();
  }, [searchParams, onSelect]);

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Select Template
      </label>
      <select
        value={selectedId} 
        onChange={(e) => {
          const template = templates.find((t) => t.id === e.target.value);
          setSelectedId(e.target.value); 
          onSelect(template || null);
        }}
        className="w-full p-2 border border-gray-300 text-black rounded mb-1 focus:outline-1 focus:outline-blue-500"
      >
        <option value="">Select Template</option>
        {templates.map((template) => (
          <option key={template.id} value={template.id}>
            {template.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function GeneratePageSkeleton() {
  return (
    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 animate-pulse">
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          {/* Page Title Skeleton */}
          <div className="h-6 bg-gray-300 rounded w-48"></div>
        </div>
        
        {/* Batch Name Field Skeleton */}
        <div className="mb-2">
          <div className="block text-sm font-medium text-gray-700 mb-2 w-24 h-4 bg-gray-300 rounded"></div>
          <div className="w-full border border-gray-300 rounded mb-4 p-2">
            <div className="h-4 bg-gray-200 rounded w-64"></div>
          </div>
        </div>
        
        {/* Template Select Skeleton */}
        <div className="mb-4">
          <div className="block text-sm font-medium text-gray-700 mb-2 w-24 h-4 bg-gray-300 rounded"></div>
          <div className="w-full border border-gray-300 rounded mb-1 p-2">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
          </div>
        </div>
        
        {/* CC Emails Field Skeleton */}
        <div className="mb-6">
          <div className="block text-sm font-medium text-gray-700 mb-2 w-24 h-4 bg-gray-300 rounded"></div>
          <div className="w-full border border-gray-300 rounded mb-4 p-2">
            <div className="h-4 bg-gray-200 rounded w-48"></div>
          </div>
        </div>
        
        {/* CSV Upload Field Skeleton */}
        <div className="mb-6">
          <div className="block text-sm font-medium text-gray-700 mb-2 w-24 h-4 bg-gray-300 rounded"></div>
          <div className="border border-gray-300 rounded p-2 mb-2">
            <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
          </div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
        
        {/* Generate Button Skeleton */}
        <div className="flex justify-end">
          <div className="bg-gray-300 text-white px-4 py-2 rounded w-40 h-10"></div>
        </div>
      </div>
    </main>
  );
}

export default function GeneratePage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dialogMessage, setDialogMessage] = useState<string | null>(null); // To store dialog message
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [ccEmails, setCcEmails] = useState<string>('');
  const [batchName, setBatchName] = useState('');
  const [csvSummary, setCsvSummary] = useState<CsvSummary | null>(null);
  const [isFormatGuideOpen, setIsFormatGuideOpen] = useState(false);
  const [bccEmails, setBccEmails] = useState<string>('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  

  // Check if the user is authenticated
  useEffect(() => {
    fetch('/api/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) {
          router.push('/login');
        } else {
          setUser(data);
        }
      });
  }, []);
  // Fetch templates when the user is authenticated
  useEffect(() => {
    if (user) {
      const fetchTemplates = async () => {
        try {
          const response = await fetch('/api/templates');
          if (!response.ok) {
            throw new Error('Failed to fetch templates');
          }
          const data: Template[] = await response.json();
          setTemplates(data);
        } catch (error) {
          console.error('Error fetching templates:', error);
          setDialogMessage('Failed to load templates.');
        }
      };
      fetchTemplates();
    }
  }, [user]);
  if (!user) return null;

  const validateCsv = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      const rows = lines.slice(1).filter(line => line.trim());
      
      const emailIndex = headers.findIndex(h => 
        h.toLowerCase() === 'email'
      );
      
      const invalidEmails: string[] = [];
      let totalEmails = 0;
      
      if (emailIndex !== -1) {
        rows.forEach(row => {
          const columns = row.split(',');
          const email = columns[emailIndex]?.trim();
          if (email) {
            totalEmails++;
            // Basic email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
              invalidEmails.push(email);
            }
          }
        });
      }

      setCsvSummary({
        columnNames: headers,
        totalRows: rows.length,
        totalEmails,
        invalidEmails
      });
      setIsDialogOpen(true);
    };
    reader.readAsText(file);
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      validateCsv(file);
    }
  };

  const handleGenerate = async () => {
    try {
      if (csvFile && selectedTemplate) {
        setIsLoading(true);
        const formData = new FormData();
        formData.append('csv', csvFile);
        formData.append('templateId', selectedTemplate.id);
        formData.append('ccEmails', ccEmails);
        formData.append('bccEmails', bccEmails);
        formData.append('batchName', batchName);
         const response = await fetch('/api/generate-certificates', {
          method: 'POST',
          body: formData,
        });
         const data = await response.json();
         if (!response.ok) {
          if (data.error === 'Insufficient tokens') {
            setDialogMessage(`Insufficient tokens. You need ${data.required} tokens but have ${data.available} available.`);
          } else {
            throw new Error(data.error || 'Failed to generate certificates');
          }
        } else {
          setDialogMessage('Certificates generated successfully!');
        }
        setIsDialogOpen(true);
      }
    } catch (error) {
      console.error('Error generating certificates:', error);
      setDialogMessage('Failed to generate certificates.');
      setIsDialogOpen(true); // Open the dialog on error too
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmGenerate = () => {
    setShowConfirmation(false);
    handleGenerate();
  };


  if (!user ) {
    return <GeneratePageSkeleton />;
  }

  
  return (
    
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Generate Certificates</h1>
          </div>
          <div className="mb-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Batch Name
          </label>
          <input
            type="text"
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
            placeholder="Enter a name for this batch of certificates"
            required
            className="w-full p-2 border border-gray-300 text-black rounded mb-4 focus:outline-1 focus:outline-blue-500"
          />
        </div>
        <Suspense fallback={
         <div className="mb-4 animate-pulse">
           <div className="h-6 bg-gray-200 rounded w-24 mb-2"></div>
           <div className="h-10 bg-gray-200 rounded w-full"></div>
         </div>
       }>
         <TemplateSelector onSelect={setSelectedTemplate} />
         {templates.length === 0 && (
           <p className="text-sm text-red-600 mb-4">
             No templates available. Please create a template first.
           </p>
         )}
       </Suspense>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CC Emails (Optional)
            </label>
            <input
              type="text"
              value={ccEmails}
              onChange={(e) => setCcEmails(e.target.value)}
              placeholder="Enter email addresses separated by commas"
              className="w-full p-2 border border-gray-300 text-black rounded mb-4 focus:outline-1 focus:outline-blue-500"
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              BCC Emails (Optional)
            </label>
            <input
              type="text"
              value={bccEmails}
              onChange={(e) => setBccEmails(e.target.value)}
              placeholder="Enter email addresses separated by commas"
              className="w-full p-2 border border-gray-300 text-black rounded mb-4 focus:outline-1 focus:outline-blue-500"
            />
          </div>
          <div className="mb-6">
            <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload CSV File
                </label>
                <button
                  onClick={() => setIsFormatGuideOpen(true)}
                  className="text-blue-600 text-sm hover:text-blue-800 underline"
                >
                  CSV Format Guide
                </button>
              </div>
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvUpload}
              className="mt-1 block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100"
            />
            <p className="text-sm text-gray-600 mt-2">
              If your CSV contains an <strong>Email</strong> column, certificates will be sent to those addresses. <span className="text-red-600 font-medium">Make sure the csv does not have any other columns that contain confidential information.</span>
            </p>
            {csvSummary && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3">CSV Summary</h3>
                <div className="space-y-2 text-sm">
                  <p>Total Rows: {csvSummary.totalRows}</p>
                  <p>Columns: {csvSummary.columnNames.join(', ')}</p>
                  <p>Total Emails: {csvSummary.totalEmails}</p>
                  <p>Estimated Tokens Required: {csvSummary.totalRows * 1}</p>
                  
                  {csvSummary.invalidEmails.length > 0 && (
                    <div className="mt-3">
                      <p className="text-red-500 font-medium">
                        ⚠️ Invalid Emails Found ({csvSummary.invalidEmails.length}):
                      </p>
                      <ul className="list-disc pl-5 mt-1 text-red-600">
                        {csvSummary.invalidEmails.map((email, i) => (
                          <li key={i}>{email}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
                    <p className="text-sm">
                      <strong>Important:</strong> Please ensure all email addresses are correct. 
                      You are responsible for the accuracy of the email addresses provided. 
                      Invalid or incorrect email addresses may result in failed certificate delivery.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setShowConfirmation(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              disabled={!selectedTemplate || !csvFile || isLoading}
            >
              {isLoading ? 'Generating...' : 'Generate Certificates'}
            </button>
          </div>
        </div>
        {isLoading && <LoadingOverlay />}
        {/* Dialog for feedback messages */}
        <FeedbackDialog 
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          message={dialogMessage}
        />
        <Dialog open={isFormatGuideOpen} onOpenChange={setIsFormatGuideOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>CSV Format Guide</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Your CSV file should include columns that match the placeholders in your certificate template.
              For example, if your certificate contains <code>{`{{Name}}`}</code> and <code>{`{{Course}}`}</code>,
              your CSV should have corresponding columns.
            </p>
            
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 text-sm text-gray-500">John Doe</td>
                    <td className="px-6 py-4 text-sm text-gray-500">Web Development</td>
                    <td className="px-6 py-4 text-sm text-gray-500">john@example.com</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm text-gray-500">Jane Smith</td>
                    <td className="px-6 py-4 text-sm text-gray-500">Data Science</td>
                    <td className="px-6 py-4 text-sm text-gray-500">jane@example.com</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium text-gray-900">Important Notes:</h3>
              <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                <li>Column headers must exactly match the placeholders in your template (case-sensitive)</li>
                <li>If you include an <strong>Email</strong> column, certificates will be automatically sent to those addresses</li>
                <li>Make sure all required placeholders from your template have corresponding columns</li>
                <li>The CSV file should be comma-separated and UTF-8 encoded</li>
                <li>Avoid including any sensitive or confidential information in additional columns</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog Box */}      
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Certificate Generation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Are you sure you want to generate certificates for this batch?</p>
            {csvSummary && (
              <div className="text-sm text-gray-600">
                <p>• Total Recipients: {csvSummary.totalRows}</p>
                <p>• Tokens Required: {csvSummary.totalRows * 1}</p>
                {ccEmails && <p>• CC Recipients: {ccEmails.split(',').filter(e => e.trim()).length}</p>}
                {bccEmails && <p>• BCC Recipients: {bccEmails.split(',').filter(e => e.trim()).length}</p>}
              </div>
            )}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmGenerate}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Confirm
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </main>
  );
}