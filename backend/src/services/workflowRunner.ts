import axios from 'axios';
import { Server } from 'socket.io';
import { WorkflowModel, IWorkflowStep } from '../models/Workflow';
import { WorkflowRunModel } from '../models/WorkflowRun';
import { UserModel } from '../models/User';
import { sendWorkflowReportEmail, dispatchWorkflowReportEmailAsync } from './mailer';

export interface IExecutionOptions {
  io?: Server;
  targetRoom?: string;
  triggerSource?: string;
  commitInfo?: {
    commitMsg?: string;
    author?: string;
    authorEmail?: string;
    repo?: string;
    branch?: string;
  };
}

export interface IStepLogTelemetry {
  stepIndex: number;
  stepId: string;
  stepName: string;
  method: string;
  url: string;
  requestHeaders: Record<string, string>;
  requestBody?: string;
  statusCode?: number;
  responseHeaders?: Record<string, any>;
  responseBody?: any;
  latencyMs: number;
  status: 'success' | 'failed' | 'error' | 'skipped';
  errorMessage?: string;
  capturedCookies?: Record<string, string>;
  extractedVars?: Record<string, string>;
  timestamp: string;
}

function getValueByPath(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  const cleanPath = path.replace(/^(\$\.|data\.)/, '');
  const keys = cleanPath.split('.');
  let current = obj;
  for (const key of keys) {
    if (current === undefined || current === null) return undefined;
    current = current[key];
  }
  return current;
}

function interpolateVariables(str: string, varsMap: Record<string, string>): string {
  if (!str) return str;
  return str.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, varName) => {
    return varsMap[varName] !== undefined ? varsMap[varName] : `{{${varName}}}`;
  });
}

function parseSetCookieHeaders(setCookieHeaders: string | string[]): Record<string, string> {
  const cookieDict: Record<string, string> = {};
  const headersArray = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];

  for (const header of headersArray) {
    if (!header) continue;
    const parts = header.split(';');
    if (parts.length > 0) {
      const [key, ...valParts] = parts[0].split('=');
      if (key && valParts.length > 0) {
        cookieDict[key.trim()] = valParts.join('=').trim();
      }
    }
  }
  return cookieDict;
}

export async function executeSingleStepTest(
  step: IWorkflowStep,
  variablesMap: Record<string, string> = {},
  cookieJar: Record<string, string> = {}
): Promise<IStepLogTelemetry> {
  const stepStartTime = Date.now();
  const finalUrl = interpolateVariables(step.url, variablesMap);

  // Process query params
  const rawParams = step.queryParams || {};
  const finalParams: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawParams)) {
    finalParams[interpolateVariables(k, variablesMap)] = interpolateVariables(v, variablesMap);
  }

  // Process headers
  const rawHeaders = step.headers || {};
  const finalHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawHeaders)) {
    finalHeaders[interpolateVariables(k, variablesMap)] = interpolateVariables(v, variablesMap);
  }

  // Pass carried cookies if available
  if (step.carryCookies !== false && Object.keys(cookieJar).length > 0) {
    const cookieStr = Object.entries(cookieJar)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
    finalHeaders['Cookie'] = cookieStr;
  }

  // Process body payload
  let finalBody: any = undefined;
  if (step.bodyPayload && step.bodyPayload.trim() !== '') {
    const interpolatedBodyStr = interpolateVariables(step.bodyPayload, variablesMap);
    try {
      finalBody = JSON.parse(interpolatedBodyStr);
    } catch {
      finalBody = interpolatedBodyStr;
    }
  }

  const stepTelemetry: IStepLogTelemetry = {
    stepIndex: 1,
    stepId: step.stepId,
    stepName: step.name,
    method: step.method,
    url: finalUrl,
    requestHeaders: finalHeaders,
    requestBody: typeof finalBody === 'object' ? JSON.stringify(finalBody) : finalBody,
    latencyMs: 0,
    status: 'success',
    timestamp: new Date().toISOString(),
  };

  const isLocalhost =
    finalUrl.includes('localhost') ||
    finalUrl.includes('127.0.0.1') ||
    finalUrl.includes('0.0.0.0') ||
    finalUrl.includes('::1');

  if (isLocalhost) {
    const latencyMs = Date.now() - stepStartTime;
    return {
      ...stepTelemetry,
      latencyMs,
      status: 'error',
      statusCode: 0,
      errorMessage: `Cannot reach user's local machine (${finalUrl}) from cloud server on Render. Local machine endpoints (http://localhost:xxx) must be executed directly in the browser via the WakeUp web app.`,
    };
  }

  try {
    const response = await axios({
      method: step.method,
      url: finalUrl,
      params: finalParams,
      headers: finalHeaders,
      data: finalBody,
      validateStatus: () => true,
      timeout: 15000,
    });

    const latencyMs = Date.now() - stepStartTime;
    stepTelemetry.latencyMs = latencyMs;
    stepTelemetry.statusCode = response.status;
    stepTelemetry.responseHeaders = response.headers as Record<string, any>;
    stepTelemetry.responseBody = response.data;

    // Capture cookies if set
    if (step.captureCookies !== false) {
      const setCookieHeader = response.headers['set-cookie'];
      if (setCookieHeader) {
        const newCookies = parseSetCookieHeaders(setCookieHeader);
        stepTelemetry.capturedCookies = newCookies;
      }
    }

    // Extract variables if defined
    if (step.extractVariables && Array.isArray(step.extractVariables)) {
      const extracted: Record<string, string> = {};
      for (const ext of step.extractVariables) {
        if (!ext.varName) continue;
        let val: any = undefined;

        if (typeof response.data === 'object' && response.data !== null) {
          val = getValueByPath(response.data, ext.jsonPath);
        } else if (typeof response.data === 'string') {
          try {
            const jsonParsed = JSON.parse(response.data);
            val = getValueByPath(jsonParsed, ext.jsonPath);
          } catch {
            val = response.data;
          }
        }

        if (val !== undefined && val !== null) {
          const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
          extracted[ext.varName] = valStr;
        }
      }
      if (Object.keys(extracted).length > 0) {
        stepTelemetry.extractedVars = extracted;
      }
    }

    // Validate expected status code
    const expectedStatus = step.expectedStatusCode || 200;
    const isStatusSuccess =
      response.status === expectedStatus ||
      (expectedStatus === 200 && response.status === 201) ||
      (expectedStatus === 201 && response.status === 200) ||
      (response.status >= 200 && response.status < 300 && (!step.expectedStatusCode || step.expectedStatusCode === 200));

    if (!isStatusSuccess) {
      stepTelemetry.status = 'failed';
      stepTelemetry.errorMessage = `Status code mismatch: Expected ${expectedStatus}, received ${response.status}`;
    }
  } catch (err: any) {
    const latencyMs = Date.now() - stepStartTime;
    stepTelemetry.latencyMs = latencyMs;
    stepTelemetry.status = 'error';
    stepTelemetry.errorMessage = err?.message || 'Network / execution error';
  }

  return stepTelemetry;
}

export async function runWorkflowExecution(
  workflowId: string,
  options?: Server | IExecutionOptions,
  legacyTargetRoom?: string
): Promise<void> {
  let io: Server | undefined;
  let targetRoom: string | undefined;
  let triggerSource: string | undefined;
  let commitInfo: IExecutionOptions['commitInfo'];

  if (options && 'emit' in options) {
    io = options as Server;
    targetRoom = legacyTargetRoom;
  } else if (options) {
    const opts = options as IExecutionOptions;
    io = opts.io;
    targetRoom = opts.targetRoom;
    triggerSource = opts.triggerSource;
    commitInfo = opts.commitInfo;
  }

  const room = targetRoom || `workflow:${workflowId}`;

  const workflow = await WorkflowModel.findById(workflowId);
  if (!workflow) {
    if (io) io.to(room).emit('workflow:error', { message: 'Workflow not found' });
    return;
  }

  const cookieJar: Record<string, string> = {};
  const variablesMap: Record<string, string> = {};
  const stepLogs: IStepLogTelemetry[] = [];
  const startTimeTotal = Date.now();

  if (io) {
    io.to(room).emit('workflow:started', {
      workflowId,
      workflowName: workflow.name,
      totalSteps: workflow.steps.length,
      startedAt: new Date().toISOString(),
    });
  }

  for (let idx = 0; idx < workflow.steps.length; idx++) {
    const step: IWorkflowStep = workflow.steps[idx];

    // Check if step is skipped
    if (step.skipped === true) {
      const skippedTelemetry: IStepLogTelemetry = {
        stepIndex: idx + 1,
        stepId: step.stepId,
        stepName: step.name,
        method: step.method,
        url: step.url,
        requestHeaders: step.headers || {},
        latencyMs: 0,
        status: 'skipped',
        errorMessage: 'Step skipped by user preference',
        timestamp: new Date().toISOString(),
      };
      stepLogs.push(skippedTelemetry);
      if (io) io.to(room).emit('workflow:step_completed', skippedTelemetry);
      continue;
    }

    const stepStartTime = Date.now();

    // 1. Interpolate variables in URL, headers, params, body
    const finalUrl = interpolateVariables(step.url, variablesMap);

    // Process query params
    const rawParams = step.queryParams || {};
    const finalParams: Record<string, string> = {};
    for (const [k, v] of Object.entries(rawParams)) {
      finalParams[interpolateVariables(k, variablesMap)] = interpolateVariables(v, variablesMap);
    }

    // Process headers
    const rawHeaders = step.headers || {};
    const finalHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(rawHeaders)) {
      finalHeaders[interpolateVariables(k, variablesMap)] = interpolateVariables(v, variablesMap);
    }

    // Pass carried cookies
    if (step.carryCookies !== false && Object.keys(cookieJar).length > 0) {
      const cookieStr = Object.entries(cookieJar)
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');
      finalHeaders['Cookie'] = cookieStr;
    }

    // Process body payload
    let finalBody: any = undefined;
    if (step.bodyPayload && step.bodyPayload.trim() !== '') {
      const interpolatedBodyStr = interpolateVariables(step.bodyPayload, variablesMap);
      try {
        finalBody = JSON.parse(interpolatedBodyStr);
      } catch {
        finalBody = interpolatedBodyStr;
      }
    }

    const stepTelemetry: IStepLogTelemetry = {
      stepIndex: idx + 1,
      stepId: step.stepId,
      stepName: step.name,
      method: step.method,
      url: finalUrl,
      requestHeaders: finalHeaders,
      requestBody: typeof finalBody === 'object' ? JSON.stringify(finalBody) : finalBody,
      latencyMs: 0,
      status: 'success',
      timestamp: new Date().toISOString(),
    };

    const isLocalhost =
      finalUrl.includes('localhost') ||
      finalUrl.includes('127.0.0.1') ||
      finalUrl.includes('0.0.0.0') ||
      finalUrl.includes('::1');

    if (isLocalhost) {
      const latencyMs = Date.now() - stepStartTime;
      stepTelemetry.latencyMs = latencyMs;
      stepTelemetry.status = 'failed';
      stepTelemetry.statusCode = 0;
      stepTelemetry.errorMessage = `Cannot reach user's local machine (${finalUrl}) from cloud server on Render. Local machine endpoints (http://localhost:xxx) must be executed directly in the browser via the WakeUp web app.`;
      stepLogs.push(stepTelemetry);
      if (io) io.to(room).emit('workflow:step_completed', stepTelemetry);
      continue;
    }

    try {
      const response = await axios({
        method: step.method,
        url: finalUrl,
        params: finalParams,
        headers: finalHeaders,
        data: finalBody,
        validateStatus: () => true,
        timeout: 15000,
      });

      const latencyMs = Date.now() - stepStartTime;
      stepTelemetry.latencyMs = latencyMs;
      stepTelemetry.statusCode = response.status;
      stepTelemetry.responseHeaders = response.headers as Record<string, any>;
      stepTelemetry.responseBody = response.data;

      // Capture cookies if set
      if (step.captureCookies !== false) {
        const setCookieHeader = response.headers['set-cookie'];
        if (setCookieHeader) {
          const newCookies = parseSetCookieHeaders(setCookieHeader);
          Object.assign(cookieJar, newCookies);
          stepTelemetry.capturedCookies = newCookies;
        }
      }

      // Extract variables if defined
      if (step.extractVariables && Array.isArray(step.extractVariables)) {
        const extracted: Record<string, string> = {};
        for (const ext of step.extractVariables) {
          if (!ext.varName) continue;
          let val: any = undefined;

          if (typeof response.data === 'object' && response.data !== null) {
            val = getValueByPath(response.data, ext.jsonPath);
          } else if (typeof response.data === 'string') {
            try {
              const jsonParsed = JSON.parse(response.data);
              val = getValueByPath(jsonParsed, ext.jsonPath);
            } catch {
              val = response.data;
            }
          }

          if (val !== undefined && val !== null) {
            const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
            variablesMap[ext.varName] = valStr;
            extracted[ext.varName] = valStr;
          }
        }
        if (Object.keys(extracted).length > 0) {
          stepTelemetry.extractedVars = extracted;
        }
      }

      // Validate expected status code
      const expectedStatus = step.expectedStatusCode || 200;
      const isStatusSuccess =
        response.status === expectedStatus ||
        (expectedStatus === 200 && response.status === 201) ||
        (expectedStatus === 201 && response.status === 200) ||
        (response.status >= 200 && response.status < 300 && (!step.expectedStatusCode || step.expectedStatusCode === 200));

      if (!isStatusSuccess) {
        stepTelemetry.status = 'failed';
        stepTelemetry.errorMessage = `Status code mismatch: Expected ${expectedStatus}, received ${response.status}`;
      }
    } catch (err: any) {
      const latencyMs = Date.now() - stepStartTime;
      stepTelemetry.latencyMs = latencyMs;
      stepTelemetry.status = 'error';
      stepTelemetry.errorMessage = err?.message || 'Network / execution error';
    }

    stepLogs.push(stepTelemetry);
    if (io) io.to(room).emit('workflow:step_completed', stepTelemetry);

    // Short gap between steps for smooth websocket UX stream
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  const totalTimeMs = Date.now() - startTimeTotal;
  const successSteps = stepLogs.filter((s) => s.status === 'success').length;
  const failedSteps = stepLogs.filter((s) => s.status === 'failed' || s.status === 'error').length;
  const overallStatus = failedSteps === 0 ? 'success' : 'failed';

  try {
    await WorkflowModel.updateOne(
      { _id: workflowId },
      {
        $set: {
          lastRunStatus: overallStatus,
          lastTriggeredAt: new Date(),
        },
      }
    );

    // Persist full execution run report to DB
    const runSource = triggerSource?.includes('GitHub') || commitInfo?.repo
      ? 'github_commit'
      : (triggerSource as any) || 'manual';

    await WorkflowRunModel.create({
      workflowId: workflow._id,
      userId: workflow.userId,
      workflowName: workflow.name,
      triggerSource: runSource,
      githubRepo: commitInfo?.repo || workflow.githubRepo || '',
      githubBranch: commitInfo?.branch || workflow.githubBranch || 'main',
      commitInfo: commitInfo || {},
      summary: {
        totalSteps: workflow.steps.length,
        successSteps,
        failedSteps,
        totalTimeMs,
        overallStatus,
        startedAt: new Date(startTimeTotal),
        finishedAt: new Date(),
      },
      stepLogs,
    });
  } catch (err) {
    console.error('Failed to update workflow run status & save run report:', err);
  }

  if (io) {
    io.to(room).emit('workflow:finished', {
      workflowId,
      totalSteps: workflow.steps.length,
      executedSteps: stepLogs.length,
      successSteps,
      failedSteps,
      totalTimeMs,
      overallStatus,
      finishedAt: new Date().toISOString(),
      logs: stepLogs,
    });
  }

  // Send Email Report via Nodemailer
  try {
    let recipientEmail = workflow.notificationEmail?.trim();

    if (!recipientEmail && workflow.userId && workflow.userId !== 'guest-user') {
      const user = await UserModel.findById(workflow.userId);
      if (user && user.email) {
        recipientEmail = user.email;
      }
    }

    if (!recipientEmail && commitInfo?.authorEmail) {
      recipientEmail = commitInfo.authorEmail;
    }

    if (recipientEmail) {
      dispatchWorkflowReportEmailAsync({
        toEmail: recipientEmail,
        workflowName: workflow.name,
        workflowId: workflow._id.toString(),
        triggerSource: triggerSource || workflow.lastTriggeredBy || 'GitHub Commit Push Trigger',
        commitInfo,
        summary: {
          totalSteps: workflow.steps.length,
          successSteps,
          failedSteps,
          totalTimeMs,
          overallStatus,
          finishedAt: new Date().toISOString(),
        },
        stepLogs,
      });
    } else {
      console.log(`[Mailer Info] No recipient email found for workflow "${workflow.name}". Skipped sending report email.`);
    }
  } catch (mailErr) {
    console.error('Failed to trigger workflow report email:', mailErr);
  }
}
