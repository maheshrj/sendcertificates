
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface GeneratePDFOptions {
    filename: string;
    elementId: string;
}

export const generatePDF = async ({ filename, elementId }: GeneratePDFOptions) => {
    const element = document.getElementById(elementId);
    if (!element) {
        throw new Error(`Element with id '${elementId}' not found`);
    }

    try {
        const canvas = await html2canvas(element, {
            scale: 2, // Improve resolution
            logging: false,
            useCORS: true // Allow cross-origin images (e.g. template previews)
        });

        const imgData = canvas.toDataURL('image/jpeg', 1.0);

        // A4 dimensions in mm
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = 0;

        // First page
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        // Multi-page logic (if report is long)
        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;
        }

        pdf.save(filename);
        return true;
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
};
