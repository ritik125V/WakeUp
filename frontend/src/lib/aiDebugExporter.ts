import { IStepTelemetryForPDF, IWorkflowRunSummaryForPDF } from './pdfReportGenerator';

/**
 * Formats failed/rejected workflow steps into pure raw API Request & Response details.
 * Contains NO conversational prompts or meta instructions—only exact sent & received HTTP data.
 */
export function generateAiDebugPrompt(
  summary: IWorkflowRunSummaryForPDF,
  failedSteps: IStepTelemetryForPDF[]
): string {
  const dateStr = new Date().toLocaleString();

  let md = `# API Execution Log: ${summary.workflowName}\n`;
  md += `**Timestamp**: ${dateStr}\n`;
  md += `**Overall Status**: ${summary.overallStatus.toUpperCase()}\n`;
  md += `**Failed Steps Count**: ${failedSteps.length} of ${summary.totalSteps}\n`;
  md += `**Total Latency**: ${summary.totalTimeMs} ms\n\n`;
  md += `---\n\n`;

  failedSteps.forEach((step) => {
    md += `### Step ${step.stepIndex}: ${step.stepName}\n`;
    md += `- **Request URL**: \`${step.method?.toUpperCase() || 'GET'} ${step.url}\`\n`;
    md += `- **Execution Status**: \`${step.status.toUpperCase()}\`\n`;
    md += `- **Response Status Code**: \`${step.statusCode || 'N/A'}\`\n`;
    md += `- **Latency**: \`${step.latencyMs} ms\`\n`;
    if (step.errorMessage) {
      md += `- **Error Message**: \`${step.errorMessage}\`\n`;
    }

    md += `\n#### 📤 Request Sent\n`;
    if (step.requestHeaders && Object.keys(step.requestHeaders).length > 0) {
      md += `**Headers**:\n\`\`\`json\n${JSON.stringify(step.requestHeaders, null, 2)}\n\`\`\`\n`;
    } else {
      md += `**Headers**: (none)\n`;
    }

    if (step.requestBody) {
      const formattedReq =
        typeof step.requestBody === 'object'
          ? JSON.stringify(step.requestBody, null, 2)
          : step.requestBody;
      md += `**Body Payload**:\n\`\`\`json\n${formattedReq}\n\`\`\`\n`;
    } else {
      md += `**Body Payload**: (empty)\n`;
    }

    md += `\n#### 📥 Response Received\n`;
    if (step.responseBody !== undefined && step.responseBody !== null) {
      const formattedResp =
        typeof step.responseBody === 'object'
          ? JSON.stringify(step.responseBody, null, 2)
          : String(step.responseBody);
      md += `**Response Payload / Error Trace**:\n\`\`\`json\n${formattedResp}\n\`\`\`\n`;
    } else {
      md += `**Response Payload**: (empty or network error)\n`;
    }

    if (step.capturedCookies && Object.keys(step.capturedCookies).length > 0) {
      md += `\n**Captured Cookies**:\n\`\`\`json\n${JSON.stringify(step.capturedCookies, null, 2)}\n\`\`\`\n`;
    }

    if (step.extractedVars && Object.keys(step.extractedVars).length > 0) {
      md += `\n**Extracted Variables State**:\n\`\`\`json\n${JSON.stringify(
        step.extractedVars,
        null,
        2
      )}\n\`\`\`\n`;
    }

    md += `\n---\n\n`;
  });

  return md;
}

/**
 * Downloads the API Request & Response details as a Markdown (.md) file.
 */
export function downloadAiDebugReportMarkdown(
  summary: IWorkflowRunSummaryForPDF,
  failedSteps: IStepTelemetryForPDF[]
) {
  const promptText = generateAiDebugPrompt(summary, failedSteps);
  const blob = new Blob([promptText], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const sanitizedName = summary.workflowName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  a.href = url;
  a.download = `api_log_${sanitizedName}_${Date.now()}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Opens a brand new browser tab showing the raw API Request Sent & Response Received log details.
 */
export function openAiDebugReportInNewTab(
  summary: IWorkflowRunSummaryForPDF,
  failedSteps: IStepTelemetryForPDF[]
) {
  const newWin = window.open('', '_blank');
  if (!newWin) {
    alert('Popup blocker blocked opening the new tab. Please allow popups for WakeUp.');
    return;
  }

  const promptText = generateAiDebugPrompt(summary, failedSteps);

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WakeUp - Rejected Steps API Log [${summary.workflowName}]</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #000000;
      color: #e5e5e5;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      padding: 24px;
      line-height: 1.6;
    }
    .container {
      max-width: 1000px;
      margin: 0 auto;
    }
    .header {
      padding-bottom: 16px;
      margin-bottom: 24px;
      border-bottom: 1px solid #262626;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }
    h1 {
      color: #f43f5e;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 0.5px;
    }
    .subtitle {
      color: #a3a3a3;
      font-size: 12px;
      margin-top: 4px;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      background: #4c0519;
      color: #fda4af;
      font-size: 11px;
      font-weight: bold;
      border-radius: 4px;
    }
    .btn-group {
      display: flex;
      gap: 10px;
    }
    .btn {
      background: #e11d48;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      font-size: 12px;
      font-weight: bold;
      border-radius: 6px;
      cursor: pointer;
      font-family: inherit;
      transition: background 0.2s;
    }
    .btn:hover { background: #f43f5e; }
    .btn-secondary {
      background: #171717;
      color: #d4d4d4;
      border: 1px solid #333333;
    }
    .btn-secondary:hover { background: #262626; }
    .card {
      background: #0a0a0a;
      border: 1px solid #1f1f1f;
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 20px;
    }
    pre {
      background: #050505;
      border: 1px solid #1e1e1e;
      padding: 16px;
      border-radius: 8px;
      white-space: pre-wrap;
      word-break: break-all;
      font-size: 12px;
      color: #f3f4f6;
      max-height: 700px;
      overflow-y: auto;
    }
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #10b981;
      color: #ffffff;
      padding: 10px 18px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: bold;
      display: none;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <span class="badge">RAW API REQUEST & RESPONSE LOG</span>
        <h1>${summary.workflowName}</h1>
        <div class="subtitle">Failed Steps: ${failedSteps.length} | Generated: ${new Date().toLocaleString()}</div>
      </div>
      <div class="btn-group">
        <button class="btn" onclick="copyPrompt()">📋 Copy API Logs</button>
        <button class="btn btn-secondary" onclick="window.print()">🖨️ Print / Save PDF</button>
      </div>
    </div>

    <div class="card">
      <div style="font-size: 13px; font-weight: bold; color: #ffffff; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
        <span>📤 Request Sent vs 📥 Response Received Details</span>
        <span style="font-size: 11px; color: #737373;">Clean technical log format</span>
      </div>
      <pre id="promptText">${escapeHtml(promptText)}</pre>
    </div>
  </div>

  <div id="toast" class="toast">✓ API Request & Response logs copied to clipboard!</div>

  <script>
    function copyPrompt() {
      const text = document.getElementById('promptText').innerText;
      navigator.clipboard.writeText(text).then(() => {
        const toast = document.getElementById('toast');
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 3000);
      });
    }
  </script>
</body>
</html>
  `;

  newWin.document.open();
  newWin.document.write(htmlContent);
  newWin.document.close();
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
