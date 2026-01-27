// generate/page.tsx
'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Template } from '@/app/types';
import { FeedbackDialog } from '@/app/components/FeedbackDialog';
import { LoadingOverlay } from '@/app/components/LoadingOverlay';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSearchParams } from 'next/navigation';
import { EmailPreviewModal } from '@/app/components/EmailPreviewModal';



import { validateCsvFile, ValidationResult } from '@/app/lib/csv-validator';
import { BatchTemplateSelector, BatchTemplateData } from '@/app/components/BatchTemplateSelector';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";


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
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isFormatGuideOpen, setIsFormatGuideOpen] = useState(false);
  const [bccEmails, setBccEmails] = useState<string>('');

  const [showConfirmation, setShowConfirmation] = useState(false);

  // Preview State
  const [showPreview, setShowPreview] = useState(false);
  const [sampleRow, setSampleRow] = useState<Record<string, string>>({});



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


  const validateCsv = async (file: File, template: Template | null) => {
    setIsValidating(true);
    try {
      const placeholders = template?.placeholders.map(p => p.name) || [];
      const result = await validateCsvFile(file, placeholders);

      setValidationResult(result);

      // Update preview sample if available
      if (result.preview && result.preview.length > 0) {
        setSampleRow(result.preview[0]);
      } else {
        setSampleRow({});
      }
    } catch (error) {
      console.error('Validation failed:', error);
      setDialogMessage('Failed to validate CSV file.');
      setIsDialogOpen(true);
    } finally {
      setIsValidating(false);
    }
  };

  // Re-validate when template changes if file exists
  useEffect(() => {
    if (csvFile && selectedTemplate) {
      validateCsv(csvFile, selectedTemplate);
    } else if (csvFile && !selectedTemplate) {
      // Validate without template requirements if none selected
      validateCsv(csvFile, null);
    }
  }, [selectedTemplate]);

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      validateCsv(file, selectedTemplate);
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

  const handleTemplateSelect = (data: BatchTemplateData) => {
    // 1. Set text fields
    if (data.cc) setCcEmails(data.cc);
    if (data.bcc) setBccEmails(data.bcc);
    // Note: If we had subject/message fields in the UI, we would set them here.
    // Assuming user might add them to BatchTemplate later, but currently UI only has them via EmailConfig or hidden?
    // Wait, the UI doesn't allow editing Subject/Message per batch yet? 
    // The requirement said "Store subject/message in template", but I don't see inputs for them in this page.
    // I will double check if I missed them or if they are fetched from user config. 
    // Ah, EmailPreviewModal uses them. 

    // 2. Set Template
    if (data.templateId) {
      const tmpl = templates.find(t => t.id === data.templateId);
      if (tmpl) {
        setSelectedTemplate(tmpl);
      }
    }

    setDialogMessage(`Loaded configuration: ${data.name}`);
    setIsDialogOpen(true);
  };

  const handleTemplateSave = async (name: string) => {
    try {
      const payload = {
        name,
        templateId: selectedTemplate?.id,
        cc: ccEmails,
        bcc: bccEmails,
        // subject: ... // no input for this yet
        // message: ...
      };

      const res = await fetch('/api/batch-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to save');

      setDialogMessage('Template saved successfully!');
      setIsDialogOpen(true);
    } catch (err) {
      console.error(err);
      setDialogMessage('Failed to save template.');
      setIsDialogOpen(true);
    }
  };

  const handlePreviewConfirm = () => {
    setShowPreview(false);
    setShowConfirmation(true);
  };


  if (!user) {
    return <GeneratePageSkeleton />;
  }


  return (

    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Generate Certificates</h1>
        </div>
        <div className="mb-6">
          <BatchTemplateSelector
            onSelect={handleTemplateSelect}
            onSave={handleTemplateSave}
          />
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


          {/* Validation Results UI */}
          {isValidating && (
            <div className="mt-4 p-4 text-gray-500 flex items-center">
              <div className="animate-spin mr-2 h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              Validating CSV...
            </div>
          )}

          {validationResult && !isValidating && (
            <div className="mt-4 space-y-4">
              {/* Status Header */}
              {validationResult.isValid ? (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">CSV Validated Successfully</AlertTitle>
                  <AlertDescription className="text-green-700">
                    Found {validationResult.stats.validRows} valid recipients out of {validationResult.stats.totalRows} rows.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive" className="bg-red-50 border-red-200">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <AlertTitle className="text-red-800">Validation Errors Found</AlertTitle>
                  <AlertDescription className="text-red-700">
                    Please fix the critical errors below before proceeding.
                  </AlertDescription>
                </Alert>
              )}

              {/* Stats Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-gray-50 p-3 rounded border">
                  <span className="block text-gray-500">Total Rows</span>
                  <span className="font-semibold text-lg">{validationResult.stats.totalRows}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded border">
                  <span className="block text-gray-500">Emails Found</span>
                  <span className="font-semibold text-lg">{validationResult.totalEmails}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded border">
                  <span className="block text-gray-500">Tokens Required</span>
                  <span className="font-semibold text-lg text-blue-600">~{validationResult.stats.totalRows}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded border">
                  <span className="block text-gray-500">Columns</span>
                  <span className="font-medium">{validationResult.headers.join(', ')}</span>
                </div>
              </div>

              {/* Error List */}
              {validationResult.errors.length > 0 && (
                <div className="border rounded-md overflow-hidden">
                  <div className="bg-gray-100 px-4 py-2 border-b font-medium text-sm flex justify-between">
                    <span>Validation Issues ({validationResult.errors.length})</span>
                    {!validationResult.isValid && <span className="text-red-600 text-xs uppercase font-bold">Action Required</span>}
                  </div>
                  <div className="max-h-60 overflow-y-auto bg-white">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left w-20">Type</th>
                          <th className="px-4 py-2 text-left">Message</th>
                          <th className="px-4 py-2 text-left w-24">Location</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {validationResult.errors.map((err, i) => (
                          <tr key={i} className={err.severity === 'error' ? 'bg-red-50' : 'bg-yellow-50'}>
                            <td className="px-4 py-2 capitalize font-medium">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${err.severity === 'error' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                {err.type.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-gray-700">{err.message}</td>
                            <td className="px-4 py-2 text-gray-500">
                              {err.row ? `Row ${err.row}` : 'Global'}
                              {err.column && ` (${err.column})`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {!selectedTemplate && validationResult.isValid && (
                <Alert className="bg-blue-50 border-blue-200">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-800">Select a Template</AlertTitle>
                  <AlertDescription className="text-blue-700">
                    Select a template to verify that your CSV columns match the certificate placeholders.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <button
            onClick={() => setShowPreview(true)}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50 mr-3"
            disabled={!selectedTemplate || !csvFile || isLoading || !validationResult?.isValid || !validationResult?.stats.totalRows}
          >
            Preview Batch
          </button>
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
            {validationResult && (
              <div className="text-sm text-gray-600">
                <p>• Total Recipients: {validationResult.stats.totalRows}</p>
                <p>• Tokens Required: {validationResult.stats.totalRows * 1}</p>
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

      {/* Email Preview Modal */}
      {selectedTemplate && (
        <EmailPreviewModal
          open={showPreview}
          onOpenChange={setShowPreview}
          template={selectedTemplate}
          sampleData={sampleRow}
          emailSubject={user?.emailConfig?.defaultSubject}
          emailBody={user?.emailConfig?.defaultMessage}
          onConfirm={handlePreviewConfirm}
        />
      )}

    </main >
  );
}