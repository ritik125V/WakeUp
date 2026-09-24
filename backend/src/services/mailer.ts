import nodemailer, { SentMessageInfo } from 'nodemailer';
import { IStepLogTelemetry } from './workflowRunner';

export interface IWorkflowReportEmailParams {
  toEmail: string | string[];
  workflowName: string;
  workflowId: string;
  triggerSource?: string;
  commitInfo?: {
    commitMsg?: string;
    author?: string;
    authorEmail?: string;
    repo?: string;
    branch?: string;
  };
  summary: {
    totalSteps: number;
    successSteps: number;
    failedSteps: number;
    totalTimeMs: number;
    overallStatus: 'success' | 'failed' | 'error' | string;
    finishedAt?: string;
  };
  stepLogs: IStepLogTelemetry[];
}

function getTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const user = process.env.SMTP_USER;
  let pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  // Google App Passwords are 16 characters, often copied with spaces like "abcd efgh ijkl mnop"
  // Clean up whitespace so Gmail accepts it seamlessly
  pass = pass.trim();
  if (pass.includes(' ') && pass.replace(/\s+/g, '').length === 16) {
    pass = pass.replace(/\s+/g, '');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user: user.trim(),
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
    // Enforce strict timeouts so mailer network calls NEVER block background processes or horizontal workers
    connectionTimeout: 8000, // 8s socket connection timeout
    greetingTimeout: 5000,   // 5s SMTP greeting timeout
    socketTimeout: 10000,    // 10s socket inactivity timeout
  });
}

export function isMailerConfigured(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function generateReportEmailHTML(params: IWorkflowReportEmailParams): string {
  const { workflowName, workflowId, triggerSource, commitInfo, summary, stepLogs } = params;
  const isSuccess = summary.overallStatus === 'success';
  const statusColor = isSuccess ? '#10b981' : '#f43f5e';
  const statusBadge = isSuccess ? 'PASSED ✅' : 'FAILED ❌';

  const stepsRows = stepLogs
    .map((log) => {
      const isStepPass = log.status === 'success';
      const stepBadgeColor = isStepPass
        ? 'background: #064e3b; color: #6ee7b7;'
        : log.status === 'skipped'
        ? 'background: #262626; color: #a3a3a3;'
        : 'background: #4c0519; color: #fca5a5;';

      const methodColor =
        log.method === 'GET'
          ? 'color: #34d399;'
          : log.method === 'POST'
          ? 'color: #facc15;'
          : log.method === 'DELETE'
          ? 'color: #f87171;'
          : 'color: #38bdf8;';

      return `
        <tr style="border-bottom: 1px solid #262626;">
          <td style="padding: 10px; font-weight: bold; color: #a3a3a3;">#${log.stepIndex}</td>
          <td style="padding: 10px; font-weight: bold; ${methodColor}">${log.method}</td>
          <td style="padding: 10px; color: #ffffff; font-weight: bold;">${log.stepName}</td>
          <td style="padding: 10px; font-family: monospace; color: #d4d4d4; font-size: 11px; word-break: break-all;">${log.url}</td>
          <td style="padding: 10px; font-weight: bold; color: #ffffff;">${log.statusCode || 'N/A'}</td>
          <td style="padding: 10px; color: #a3a3a3;">${log.latencyMs}ms</td>
          <td style="padding: 10px;">
            <span style="display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; ${stepBadgeColor}">
              ${log.status.toUpperCase()}
            </span>
          </td>
        </tr>
        ${
          log.errorMessage
            ? `
          <tr>
            <td colspan="7" style="padding: 6px 10px 10px 10px; background: #1a0509; color: #fca5a5; font-size: 11px; font-family: monospace;">
              ⚠️ Error: ${log.errorMessage}
            </td>
          </tr>`
            : ''
        }
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Workflow Execution Report - ${workflowName}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e5e5e5;">
        <div style="max-width: 680px; margin: 20px auto; background-color: #0a0a0a; border-radius: 12px; overflow: hidden; font-size: 13px;">
          
          <!-- Header Banner -->
          <div style="background-color: #121212; padding: 24px; text-align: left; border-bottom: 2px solid ${statusColor};">
            <div style="font-size: 11px; font-weight: bold; letter-spacing: 1px; color: #888888; text-transform: uppercase; margin-bottom: 6px;">
              ⚡ WakeUp Automation Runner Report
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #ffffff;">
                ${workflowName}
              </h1>
              <span style="display: inline-block; padding: 6px 14px; background-color: ${statusColor}20; color: ${statusColor}; font-weight: 800; font-size: 12px; border-radius: 6px;">
                ${statusBadge}
              </span>
            </div>
          </div>

          <!-- Metadata Summary Card -->
          <div style="padding: 20px 24px; background-color: #0f0f0f; border-bottom: 1px solid #1a1a1a;">
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
              <tr>
                <td style="padding: 6px 0; color: #888888; width: 140px;">Trigger Event:</td>
                <td style="padding: 6px 0; color: #ffffff; font-weight: bold;">${triggerSource || 'GitHub Webhook Push'}</td>
              </tr>
              ${
                commitInfo?.repo
                  ? `
              <tr>
                <td style="padding: 6px 0; color: #888888;">Repository:</td>
                <td style="padding: 6px 0; color: #38bdf8; font-weight: bold; font-family: monospace;">${commitInfo.repo} (${commitInfo.branch || 'main'})</td>
              </tr>`
                  : ''
              }
              ${
                commitInfo?.commitMsg
                  ? `
              <tr>
                <td style="padding: 6px 0; color: #888888;">Latest Commit:</td>
                <td style="padding: 6px 0; color: #e5e5e5; font-family: monospace;">"${commitInfo.commitMsg}" ${commitInfo.author ? `by @${commitInfo.author}` : ''}</td>
              </tr>`
                  : ''
              }
              <tr>
                <td style="padding: 6px 0; color: #888888;">Pass / Fail Ratio:</td>
                <td style="padding: 6px 0; color: #ffffff;">
                  <strong style="color: #10b981;">${summary.successSteps} Passed</strong> / 
                  <strong style="color: #f43f5e;">${summary.failedSteps} Failed</strong> 
                  (${summary.totalSteps} Total Steps)
                </td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #888888;">Total Latency:</td>
                <td style="padding: 6px 0; color: #ffffff; font-weight: bold;">${summary.totalTimeMs} ms</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #888888;">Executed At:</td>
                <td style="padding: 6px 0; color: #a3a3a3;">${summary.finishedAt || new Date().toUTCString()}</td>
              </tr>
            </table>
          </div>

          <!-- Step Execution Logs Table -->
          <div style="padding: 24px;">
            <h3 style="margin-top: 0; margin-bottom: 14px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #ffffff;">
              📋 Step-by-Step Telemetry
            </h3>

            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; background-color: #050505; border-radius: 8px; overflow: hidden;">
              <thead>
                <tr style="background-color: #141414; color: #888888; font-size: 11px; text-transform: uppercase;">
                  <th style="padding: 10px;">#</th>
                  <th style="padding: 10px;">Method</th>
                  <th style="padding: 10px;">Step Name</th>
                  <th style="padding: 10px;">Endpoint URL</th>
                  <th style="padding: 10px;">HTTP</th>
                  <th style="padding: 10px;">Time</th>
                  <th style="padding: 10px;">Result</th>
                </tr>
              </thead>
              <tbody>
                ${stepsRows}
              </tbody>
            </table>
          </div>

          <!-- Footer -->
          <div style="padding: 16px 24px; background-color: #050505; text-align: center; border-top: 1px solid #141414; color: #666666; font-size: 11px;">
            Sent automatically by WakeUp API Workflow Automation & Monitoring Engine.<br>
            Workflow ID: <code style="color: #888888;">${workflowId}</code>
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function sendWorkflowReportEmail(params: IWorkflowReportEmailParams): Promise<boolean> {
  try {
    const transporter = getTransporter();
    if (!transporter) {
      console.log(
        `[Mailer Warning] SMTP environment variables (SMTP_USER/SMTP_PASS) not set. Skipping report email for workflow "${params.workflowName}".`
      );
      return false;
    }

    const recipients = Array.isArray(params.toEmail) ? params.toEmail.join(', ') : params.toEmail;
    if (!recipients || recipients.trim() === '') {
      console.log(`[Mailer Warning] No recipient email specified for workflow "${params.workflowName}". Skipping email.`);
      return false;
    }

    const fromAddress = process.env.EMAIL_FROM || '"WakeUp Flow Runner" <no-reply@wakeup.io>';
    const isSuccess = params.summary.overallStatus === 'success';
    const subjectBadge = isSuccess ? '✅ PASSED' : '❌ FAILED';
    const subject = `[WakeUp Report ${subjectBadge}] ${params.workflowName} (${params.summary.successSteps}/${params.summary.totalSteps} passed)`;

    const html = generateReportEmailHTML(params);

    const mailOptions = {
      from: fromAddress,
      to: recipients,
      subject,
      html,
    };

    // Race sendMail against a 12s hard timeout guard to guarantee non-blocking behavior
    const sendPromise = transporter.sendMail(mailOptions);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('SMTP transmission timed out after 12000ms')), 12000)
    );

    const info = (await Promise.race([sendPromise, timeoutPromise])) as SentMessageInfo;
    console.log(`[Mailer Success] Workflow report email sent to ${recipients}. Message ID: ${info.messageId}`);
    return true;
  } catch (error: any) {
    console.error(`[Mailer Error] Failed to send workflow report email for "${params.workflowName}":`, error?.message || error);
    return false;
  }
}

/**
 * Non-blocking async fire-and-forget helper.
 * Completely detaches mail dispatch from current call stack using setImmediate.
 * Ensures HTTP request loops & workflow runner never wait for email completion.
 */
export function dispatchWorkflowReportEmailAsync(params: IWorkflowReportEmailParams): void {
  setImmediate(() => {
    sendWorkflowReportEmail(params).catch((error) => {
      console.error(`[Mailer Async Guard] Non-blocking dispatch error for "${params.workflowName}":`, error?.message || error);
    });
  });
}

