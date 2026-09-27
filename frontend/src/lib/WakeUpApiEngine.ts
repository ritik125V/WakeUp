import { IWorkflowStepData, WorkflowData } from './api';

export interface WakeUpApiTelemetry {
  stepIndex: number;
  stepId: string;
  stepName: string;
  method: string;
  url: string;
  requestHeaders: Record<string, string>;
  responseHeaders?: Record<string, string>;
  statusCode: number;
  responseBody: string;
  latencyMs: number;
  status: 'success' | 'failed' | 'error' | 'skipped';
  errorMessage?: string;
  capturedCookies?: Record<string, string>;
  extractedVars?: Record<string, string>;
  timestamp: string;
}

export interface WakeUpFlowSummary {
  workflowName: string;
  startedAt: string;
  finishedAt: string;
  totalTimeMs: number;
  totalSteps: number;
  successSteps: number;
  failedSteps: number;
  overallStatus: 'success' | 'failed' | 'error';
  steps: WakeUpApiTelemetry[];
}

/**
 * Replaces dynamic variables formatted as {{varName}} inside a string
 */
export function interpolateVariables(template: string = '', variablesContext: Record<string, string> = {}): string {
  let resolved = template;
  Object.entries(variablesContext).forEach(([varKey, varVal]) => {
    resolved = resolved.replace(new RegExp(`\\{\\{${varKey}\\}\\}`, 'g'), varVal);
  });
  return resolved;
}

/**
 * Extracts set-cookie headers or simulates cookie jar tracking
 */
export function updateCookieJar(
  responseHeaders: Headers,
  existingJar: Record<string, string> = {}
): Record<string, string> {
  const updatedJar = { ...existingJar };
  try {
    const cookieHeader = responseHeaders.get('set-cookie');
    if (cookieHeader) {
      const parts = cookieHeader.split(',');
      for (const part of parts) {
        const pair = part.split(';')[0].trim();
        const [k, ...vParts] = pair.split('=');
        if (k && vParts.length > 0) {
          updatedJar[k.trim()] = vParts.join('=').trim();
        }
      }
    }
  } catch {}

  // Detect cookies set directly in document.cookie by backend or browser
  if (typeof document !== 'undefined' && document.cookie) {
    try {
      const docCookies = document.cookie.split(';');
      for (const c of docCookies) {
        const pair = c.trim();
        if (!pair) continue;
        const [k, ...vParts] = pair.split('=');
        if (k && vParts.length > 0) {
          updatedJar[k.trim()] = vParts.join('=').trim();
        }
      }
    } catch {}
  }

  return updatedJar;
}

/**
 * WakeUp API Engine - Direct Browser Execution Step Runner
 * Executes an HTTP request directly from the browser (Postman/cURL style)
 */
export async function executeWakeUpApiStep(
  step: IWorkflowStepData,
  variablesContext: Record<string, string> = {},
  cookiesContext: Record<string, string> = {}
): Promise<{
  stepId: string;
  stepName: string;
  url: string;
  method: string;
  status: 'success' | 'failed' | 'error';
  statusCode: number;
  latencyMs: number;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  errorMessage?: string;
  responseSnippet: string;
  capturedCookies: Record<string, string>;
  extractedVars: Record<string, string>;
}> {
  const startTime = performance.now();

  // Interpolate Variables in URL
  const resolvedUrl = interpolateVariables(step.url || '', variablesContext);

  const isLocalhost =
    resolvedUrl.includes('localhost') ||
    resolvedUrl.includes('127.0.0.1') ||
    resolvedUrl.includes('0.0.0.0') ||
    resolvedUrl.includes('::1');

  // For non-localhost APIs, execute via dedicated api-runner microservice (Zero CORS issues)
  if (!isLocalhost) {
    try {
      const RUNNER_URL = process.env.NEXT_PUBLIC_API_RUNNER_URL || 'https://wakeup-api-runner.ritikvermav5.workers.dev/api';
      const MAIN_BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

      let response: Response | null = null;

      // Try dedicated api-runner microservice first (port 5001)
      try {
        response = await fetch(`${RUNNER_URL}/execute-step`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            step: { ...step, url: resolvedUrl },
            variablesContext: variablesContext || {},
            cookiesContext: cookiesContext || {},
          }),
        });
      } catch (runnerErr) {
        // Fallback to main backend service
        response = await fetch(`${MAIN_BACKEND_URL}/workflows/test-step`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            step: { ...step, url: resolvedUrl },
            variablesContext: variablesContext || {},
            cookiesContext: cookiesContext || {},
          }),
        });
      }

      if (response.ok) {
        const data = await response.json();
        if (data && data.result) {
          const res = data.result;
          let responseSnippet = '';
          if (typeof res.responseBody === 'object' && res.responseBody !== null) {
            responseSnippet = JSON.stringify(res.responseBody, null, 2);
          } else if (typeof res.responseBody === 'string') {
            responseSnippet = res.responseBody;
          } else if (res.responseSnippet) {
            responseSnippet = res.responseSnippet;
          }

          const capturedCookies = { ...cookiesContext, ...(res.capturedCookies || {}) };
          const extractedVars = res.extractedVars || {};

          return {
            stepId: res.stepId || step.stepId,
            stepName: res.stepName || step.name,
            url: res.url || resolvedUrl,
            method: res.method || step.method,
            status: res.status === 'success' ? 'success' : res.status === 'failed' ? 'failed' : 'error',
            statusCode: res.statusCode || 0,
            latencyMs: res.latencyMs || Math.round(performance.now() - startTime),
            requestHeaders: res.requestHeaders || {},
            responseHeaders: res.responseHeaders || {},
            errorMessage: res.errorMessage,
            responseSnippet,
            capturedCookies,
            extractedVars,
          };
        }
      }
    } catch (serverErr) {
      console.warn('Backend server proxy step execution failed, falling back to browser direct fetch:', serverErr);
    }
  }

  // Interpolate Variables in Request Headers
  const resolvedHeaders: Record<string, string> = {};
  if (step.headers) {
    Object.entries(step.headers).forEach(([k, v]) => {
      resolvedHeaders[k] = interpolateVariables(v, variablesContext);
    });
  }

  // Handle Cookie Carryover
  if (step.carryCookies && Object.keys(cookiesContext).length > 0) {
    const cookieStr = Object.entries(cookiesContext)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
    if (resolvedHeaders['Cookie']) {
      resolvedHeaders['Cookie'] += `; ${cookieStr}`;
    } else {
      resolvedHeaders['Cookie'] = cookieStr;
    }
  }

  // Interpolate Variables in Request Body Payload
  let resolvedBody: string | undefined = undefined;
  if (step.bodyPayload && step.method !== 'GET' && step.method !== 'HEAD') {
    resolvedBody = interpolateVariables(step.bodyPayload, variablesContext);
  }

  try {
    const fetchOptions: RequestInit = {
      method: step.method || 'GET',
      headers: Object.keys(resolvedHeaders).length > 0 ? resolvedHeaders : undefined,
      body: resolvedBody,
      credentials: 'include',
    };

    let response: Response;
    let isOpaque = false;

    try {
      response = await fetch(resolvedUrl, fetchOptions);
    } catch (corsErr: any) {
      // Fallback: If preflight/CORS is blocked, attempt mode: 'no-cors' to test local server connectivity
      try {
        response = await fetch(resolvedUrl, { ...fetchOptions, mode: 'no-cors' });
        isOpaque = true;
      } catch (opaqueErr: any) {
        const latencyMs = Math.round(performance.now() - startTime);
        return {
          stepId: step.stepId,
          stepName: step.name,
          url: resolvedUrl,
          method: step.method,
          status: 'error',
          statusCode: 0,
          latencyMs,
          requestHeaders: resolvedHeaders,
          responseHeaders: {},
          errorMessage: `connect ECONNREFUSED or port unreachable on ${resolvedUrl}. Verify target API server is active.`,
          responseSnippet: '',
          capturedCookies: {},
          extractedVars: {},
        };
      }
    }

    const latencyMs = Math.round(performance.now() - startTime);

    // Capture Response Headers
    const respHeadersObj: Record<string, string> = {};
    if (response.headers) {
      response.headers.forEach((val, key) => {
        respHeadersObj[key] = val;
      });
    }

    // Capture Cookies if any
    const capturedCookies = updateCookieJar(response.headers, cookiesContext);

    if (isOpaque) {
      return {
        stepId: step.stepId,
        stepName: step.name,
        url: resolvedUrl,
        method: step.method,
        status: 'success',
        statusCode: 200,
        latencyMs,
        requestHeaders: resolvedHeaders,
        responseHeaders: respHeadersObj,
        responseSnippet: `Target server reachable in ${latencyMs}ms (Direct Browser Execution).\n\n⚠️ Note: Response body & exact HTTP status are hidden by Browser Security because target API is missing CORS headers.\n\n💡 To view full JSON response body & headers, enable CORS on backend:\n  • Express.js: app.use(require('cors')())\n  • Python FastAPI: app.add_middleware(CORSMiddleware, allow_origins=["*"])\n  • Python Flask: CORS(app)\n  • Spring Boot: @CrossOrigin(origins = "*")`,
        capturedCookies,
        extractedVars: {},
      };
    }

    const statusCode = response.status;
    const expected = step.expectedStatusCode || 200;
    const isSuccess =
      statusCode === expected ||
      (expected === 200 && statusCode === 201) ||
      (expected === 201 && statusCode === 200) ||
      (statusCode >= 200 && statusCode < 300 && (!step.expectedStatusCode || step.expectedStatusCode === 200 || step.expectedStatusCode === 201));

    let errorMessage: string | undefined = undefined;
    if (!isSuccess) {
      errorMessage = `Status code mismatch: Expected ${expected}, received ${statusCode}`;
    }

    let responseSnippet = '';
    try {
      responseSnippet = await response.text();
      if (responseSnippet.length > 5000) {
        responseSnippet = responseSnippet.substring(0, 5000) + '\n... (truncated for telemetry display)';
      }
    } catch {
      responseSnippet = '[Binary / Non-text Response Payload]';
    }

    // Extract Dynamic Variables if defined via JSONPath / Dot notation
    const extractedVars: Record<string, string> = {};
    if (step.extractVariables && Array.isArray(step.extractVariables)) {
      try {
        const json = JSON.parse(responseSnippet);
        for (const ext of step.extractVariables) {
          if (ext.varName && ext.jsonPath) {
            const cleanPath = ext.jsonPath.replace(/^(\$\.|data\.)/, '');
            const val = cleanPath.split('.').reduce((o: any, i) => o?.[i], json);
            if (val !== undefined && val !== null) {
              const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
              extractedVars[ext.varName] = valStr;
            }
          }
        }
      } catch {}
    }

    return {
      stepId: step.stepId,
      stepName: step.name,
      url: resolvedUrl,
      method: step.method,
      status: isSuccess ? 'success' : 'failed',
      statusCode,
      latencyMs,
      requestHeaders: resolvedHeaders,
      responseHeaders: respHeadersObj,
      errorMessage,
      responseSnippet,
      capturedCookies,
      extractedVars,
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      stepId: step.stepId,
      stepName: step.name,
      url: resolvedUrl,
      method: step.method,
      status: 'error',
      statusCode: 0,
      latencyMs,
      requestHeaders: resolvedHeaders,
      responseHeaders: {},
      errorMessage: err?.message || 'Failed to execute direct browser API request',
      responseSnippet: '',
      capturedCookies: {},
      extractedVars: {},
    };
  }
}

/**
 * WakeUp API Engine - Full Multi-Step Flow Pipeline Runner
 * Runs a complete workflow directly in browser carrying cookies & variables step-to-step
 */
export async function executeWakeUpApiFlow(
  workflow: WorkflowData,
  onStepCompleted?: (telemetry: WakeUpApiTelemetry) => void
): Promise<WakeUpFlowSummary> {
  const startTime = Date.now();
  const stepLogs: WakeUpApiTelemetry[] = [];
  let variablesContext: Record<string, string> = {};
  let cookiesContext: Record<string, string> = {};
  let overallStatus: 'success' | 'failed' | 'error' = 'success';

  for (let idx = 0; idx < workflow.steps.length; idx++) {
    const step = workflow.steps[idx];

    if (step.skipped) {
      const skippedTelemetry: WakeUpApiTelemetry = {
        stepIndex: idx + 1,
        stepId: step.stepId,
        stepName: step.name,
        method: step.method,
        url: step.url,
        requestHeaders: step.headers || {},
        responseHeaders: {},
        statusCode: 0,
        responseBody: '',
        latencyMs: 0,
        status: 'skipped',
        errorMessage: 'Step skipped by user preference',
        timestamp: new Date().toISOString(),
      };
      stepLogs.push(skippedTelemetry);
      if (onStepCompleted) onStepCompleted(skippedTelemetry);
      continue;
    }

    const stepResult = await executeWakeUpApiStep(step, variablesContext, cookiesContext);

    // Update Context
    if (stepResult.extractedVars) {
      variablesContext = { ...variablesContext, ...stepResult.extractedVars };
    }
    if (stepResult.capturedCookies) {
      cookiesContext = { ...cookiesContext, ...stepResult.capturedCookies };
    }

    const telemetry: WakeUpApiTelemetry = {
      stepIndex: idx + 1,
      stepId: step.stepId,
      stepName: step.name,
      method: step.method,
      url: stepResult.url || step.url,
      requestHeaders: stepResult.requestHeaders,
      responseHeaders: stepResult.responseHeaders,
      statusCode: stepResult.statusCode,
      responseBody: stepResult.responseSnippet,
      latencyMs: stepResult.latencyMs,
      status: stepResult.status === 'success' ? 'success' : 'failed',
      errorMessage: stepResult.errorMessage,
      capturedCookies: stepResult.capturedCookies,
      extractedVars: stepResult.extractedVars,
      timestamp: new Date().toISOString(),
    };

    if (telemetry.status === 'failed') {
      overallStatus = 'failed';
    }

    stepLogs.push(telemetry);
    if (onStepCompleted) onStepCompleted(telemetry);
  }

  const finishedAt = new Date().toISOString();
  const totalTimeMs = Date.now() - startTime;

  return {
    workflowName: workflow.name,
    startedAt: new Date(startTime).toISOString(),
    finishedAt,
    totalTimeMs,
    totalSteps: workflow.steps.length,
    successSteps: stepLogs.filter((s) => s.status === 'success').length,
    failedSteps: stepLogs.filter((s) => s.status === 'failed' || s.status === 'error').length,
    overallStatus,
    steps: stepLogs,
  };
}
