
/**
 * CSV Validation Utility
 * 
 * robust validation for CSV uploads, ensuring they match certificate templates
 * and contain valid data before processing.
 */

export interface ValidationError {
    type: 'missing_column' | 'invalid_email' | 'empty_field' | 'format_error' | 'extra_column';
    message: string;
    row?: number; // 1-indexed
    column?: string;
    severity: 'error' | 'warning';
}

export interface ValidationResult {
    isValid: boolean; // True if no blocking errors
    stats: {
        totalRows: number;
        validRows: number;
        invalidRows: number;
    };
    errors: ValidationError[];
    headers: string[];
    preview: Record<string, string>[];
    totalEmails: number;
}

/**
 * Validates a CSV file against template requirements
 */
export async function validateCsvFile(
    file: File,
    templatePlaceholders: string[] = [] // Optional: if provided, validates columns match
): Promise<ValidationResult> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const lines = text.split(/\r\n|\n/).filter(line => line.trim());

                if (lines.length === 0) {
                    resolve({
                        isValid: false,
                        stats: { totalRows: 0, validRows: 0, invalidRows: 0 },
                        errors: [{ type: 'format_error', message: 'File is empty', severity: 'error' }],
                        headers: [],
                        preview: [],
                        totalEmails: 0
                    });
                    return;
                }

                // Parse Headers
                const headers = parseCsvLine(lines[0]);
                const normalizedHeaders = headers.map(h => h.trim());
                const errors: ValidationError[] = [];
                const requiredColumns = templatePlaceholders.map(p => p.trim());

                // 1. Validate Columns
                const missingColumns = requiredColumns.filter(
                    req => !normalizedHeaders.includes(req)
                );

                if (missingColumns.length > 0) {
                    errors.push({
                        type: 'missing_column',
                        message: `Missing required columns: ${missingColumns.join(', ')}`,
                        severity: 'error'
                    });
                }

                // Find Email Column (Case insensitive)
                const emailIndex = normalizedHeaders.findIndex(h => h.toLowerCase() === 'email');
                if (emailIndex === -1 && lines.length > 1) {
                    // Warning if no email column, but maybe they just want to generate PDFs? 
                    // Usually email is required for this app.
                    errors.push({
                        type: 'missing_column',
                        message: 'Column "Email" is missing. Certificates cannot be sent.',
                        severity: 'warning' // or error depending on business logic
                    });
                }

                // 2. Validate Rows
                const dataRows = lines.slice(1);
                let validRowsCount = 0;
                let invalidRowsCount = 0;
                let totalEmails = 0;
                const previewRows: Record<string, string>[] = [];

                dataRows.forEach((line, index) => {
                    const rowNum = index + 2; // 1-based, skipping header
                    const columns = parseCsvLine(line);

                    if (columns.length !== headers.length) {
                        errors.push({
                            type: 'format_error',
                            message: `Row has ${columns.length} columns, expected ${headers.length}`,
                            row: rowNum,
                            severity: 'warning'
                        });
                    }

                    let rowIsValid = true;
                    const rowData: Record<string, string> = {};

                    // Map data to headers
                    headers.forEach((header, i) => {
                        rowData[header] = columns[i]?.trim() || '';
                    });

                    // Check Required Fields (from template)
                    requiredColumns.forEach(reqCol => {
                        if (!rowData[reqCol]) {
                            errors.push({
                                type: 'empty_field',
                                message: `Required field "${reqCol}" is empty`,
                                row: rowNum,
                                column: reqCol,
                                severity: 'warning'
                            });
                            rowIsValid = false;
                        }
                    });

                    // Check Email
                    if (emailIndex !== -1) {
                        const email = columns[emailIndex]?.trim();
                        if (email) {
                            totalEmails++;
                            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                            if (!emailRegex.test(email)) {
                                errors.push({
                                    type: 'invalid_email',
                                    message: `Invalid email format: ${email}`,
                                    row: rowNum,
                                    column: headers[emailIndex],
                                    severity: 'warning'
                                });
                                rowIsValid = false;
                            }
                        } else {
                            // Empty email is okay if not all rows trigger emails? 
                            // Assuming strictly required for this row to be useful
                        }
                    }

                    if (rowIsValid) validRowsCount++;
                    else invalidRowsCount++;

                    // Collect preview (first 5 rows)
                    if (previewRows.length < 5) {
                        previewRows.push(rowData);
                    }
                });

                // Determine critical blocking errors
                const hasBlockingErrors = errors.some(e => e.severity === 'error');

                resolve({
                    isValid: !hasBlockingErrors,
                    stats: {
                        totalRows: dataRows.length,
                        validRows: validRowsCount,
                        invalidRows: invalidRowsCount
                    },
                    errors,
                    headers: normalizedHeaders,
                    preview: previewRows,
                    totalEmails
                });

            } catch (err) {
                reject(err);
            }
        };

        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };

        reader.readAsText(file);
    });
}

/**
 * Simple CSV line parser that handles quoted values
 */
function parseCsvLine(line: string): string[] {
    const result = [];
    let currentValue = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(currentValue);
            currentValue = '';
        } else {
            currentValue += char;
        }
    }
    result.push(currentValue);
    return result;
}
