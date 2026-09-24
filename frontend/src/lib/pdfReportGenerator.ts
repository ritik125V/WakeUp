import jsPDF from 'jspdf';

export interface IStepTelemetryForPDF {
  stepIndex: number;
  stepName: string;
  method: string;
  url: string;
  statusCode?: number;
  latencyMs: number;
  status: string;
  errorMessage?: string;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
  responseBody?: any;
  capturedCookies?: Record<string, string>;
  extractedVars?: Record<string, string>;
}

export interface IWorkflowRunSummaryForPDF {
  workflowName: string;
  startedAt: string;
  finishedAt: string;
  totalTimeMs: number;
  totalSteps: number;
  successSteps: number;
  failedSteps: number;
  overallStatus: string;
  steps: IStepTelemetryForPDF[];
}

export function buildWorkflowPDF(summary: IWorkflowRunSummaryForPDF): jsPDF {
  const doc = new jsPDF();
  let y = 15;

  // Header Banner
  doc.setFillColor(10, 10, 10);
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(244, 114, 182); // Rose-300 accent color
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('WAKEUP API WORKFLOW AUDIT REPORT', 14, 18);

  doc.setTextColor(200, 200, 200);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated at: ${new Date().toLocaleString()}`, 14, 26);

  y = 42;

  // Summary Card Box
  const isSuccess = summary.overallStatus === 'success';
  doc.setFillColor(isSuccess ? 240 : 254, isSuccess ? 253 : 242, isSuccess ? 244 : 242);
  doc.rect(14, y, 182, 36, 'F');

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Workflow: ${summary.workflowName}`, 18, y + 9);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(isSuccess ? 22 : 220, isSuccess ? 101 : 38, isSuccess ? 52 : 38);
  doc.text(`Overall Status: ${summary.overallStatus.toUpperCase()}`, 18, y + 17);

  doc.setTextColor(60, 60, 60);
  doc.text(`Total Execution Time: ${summary.totalTimeMs} ms`, 18, y + 24);
  doc.text(`Total Steps: ${summary.totalSteps}  |  Passed: ${summary.successSteps}  |  Failed: ${summary.failedSteps}`, 18, y + 31);

  y += 46;

  // Breakdown Title
  doc.setTextColor(10, 10, 10);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Step Execution Breakdown', 14, y);
  y += 8;

  // Iterate Steps
  summary.steps.forEach((step) => {
    if (y > 255) {
      doc.addPage();
      y = 15;
    }

    const stepSuccess = step.status === 'success';

    // Step Row Card Header
    doc.setFillColor(stepSuccess ? 240 : 255, stepSuccess ? 253 : 242, stepSuccess ? 244 : 242);
    doc.rect(14, y, 182, 10, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(stepSuccess ? 22 : 185, stepSuccess ? 101 : 28, stepSuccess ? 52 : 28);
    doc.text(`Step ${step.stepIndex}: ${step.stepName} [${step.method}]`, 18, y + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(`${step.statusCode || 'ERR'} | ${step.latencyMs}ms`, 160, y + 7);

    y += 14;

    // Details Block
    doc.setFontSize(8);
    doc.setFont('courier', 'normal');
    doc.setTextColor(80, 80, 80);
    const urlText = `URL: ${step.url}`;
    const splitUrl = doc.splitTextToSize(urlText, 178);
    doc.text(splitUrl, 18, y);
    y += splitUrl.length * 4 + 2;

    if (step.errorMessage) {
      doc.setTextColor(220, 38, 38);
      doc.text(`Error: ${step.errorMessage}`, 18, y);
      y += 6;
    }

    if (step.capturedCookies && Object.keys(step.capturedCookies).length > 0) {
      doc.setTextColor(79, 70, 229);
      doc.text(`Captured Cookies: ${Object.keys(step.capturedCookies).join(', ')}`, 18, y);
      y += 6;
    }

    if (step.extractedVars && Object.keys(step.extractedVars).length > 0) {
      doc.setTextColor(16, 185, 129);
      doc.text(`Extracted Variables: ${JSON.stringify(step.extractedVars)}`, 18, y);
      y += 6;
    }

    y += 4;
  });

  // Footer on all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`WakeUp Flow Runner Audit Report - Page ${i} of ${pageCount}`, 14, 287);
  }

  return doc;
}

export function generateWorkflowPDFReport(summary: IWorkflowRunSummaryForPDF) {
  const doc = buildWorkflowPDF(summary);
  doc.save(`WakeUp_Workflow_Audit_${summary.workflowName.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
}

export function openWorkflowPDFInNewTab(summary: IWorkflowRunSummaryForPDF) {
  const doc = buildWorkflowPDF(summary);
  const pdfBlobUrl = doc.output('bloburl');
  window.open(pdfBlobUrl, '_blank');
}
