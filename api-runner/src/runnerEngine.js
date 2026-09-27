/**
 * Extracts value from nested JSON object by path (e.g. data.token or token)
 */
export function getValueByPath(obj, path) {
    if (!obj || !path)
        return undefined;
    const cleanPath = path.replace(/^(\$\.|data\.)/, '');
    const keys = cleanPath.split('.');
    let current = obj;
    for (const key of keys) {
        if (current === undefined || current === null)
            return undefined;
        current = current[key];
    }
    return current;
}
/**
 * Replaces dynamic variables formatted as {{varName}} inside a string template
 */
export function interpolateVariables(template = '', variablesContext = {}) {
    if (!template)
        return template;
    return template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, varName) => {
        return variablesContext[varName] !== undefined ? variablesContext[varName] : `{{${varName}}}`;
    });
}
/**
 * Parses set-cookie response headers into a cookie dictionary
 */
export function parseSetCookieHeaders(responseHeaders) {
    const cookieDict = {};
    try {
        const rawCookies = responseHeaders.get('set-cookie');
        if (rawCookies) {
            const parts = rawCookies.split(',');
            for (const part of parts) {
                const pair = part.split(';')[0].trim();
                const [k, ...vParts] = pair.split('=');
                if (k && vParts.length > 0) {
                    cookieDict[k.trim()] = vParts.join('=').trim();
                }
            }
        }
    }
    catch { }
    return cookieDict;
}
/**
 * Cloudflare Edge Worker Step Runner
 * Executes an HTTP API step natively from Cloudflare's global edge network (Zero CORS)
 */
export async function executeSingleStep(step, variablesContext = {}, cookiesContext = {}) {
    const stepStartTime = Date.now();
    // Interpolate dynamic variables in URL
    let finalUrl = interpolateVariables(step.url || '', variablesContext);
    // Append query parameters
    if (step.queryParams && Object.keys(step.queryParams).length > 0) {
        const urlObj = new URL(finalUrl);
        Object.entries(step.queryParams).forEach(([k, v]) => {
            const resolvedK = interpolateVariables(k, variablesContext);
            const resolvedV = interpolateVariables(v, variablesContext);
            urlObj.searchParams.append(resolvedK, resolvedV);
        });
        finalUrl = urlObj.toString();
    }
    // Interpolate request headers
    const rawHeaders = step.headers || {};
    const finalHeaders = {};
    for (const [k, v] of Object.entries(rawHeaders)) {
        finalHeaders[interpolateVariables(k, variablesContext)] = interpolateVariables(v, variablesContext);
    }
    // Carry forward cookies across steps
    if (step.carryCookies !== false && Object.keys(cookiesContext).length > 0) {
        const cookieStr = Object.entries(cookiesContext)
            .map(([k, v]) => `${k}=${v}`)
            .join('; ');
        if (finalHeaders['Cookie']) {
            finalHeaders['Cookie'] += `; ${cookieStr}`;
        }
        else {
            finalHeaders['Cookie'] = cookieStr;
        }
    }
    // Interpolate request body payload
    let finalBody = undefined;
    if (step.bodyPayload && step.method !== 'GET' && step.method !== 'HEAD') {
        finalBody = interpolateVariables(step.bodyPayload, variablesContext);
    }
    const stepTelemetry = {
        stepIndex: 1,
        stepId: step.stepId || 'step-1',
        stepName: step.name || 'API Step',
        method: step.method || 'GET',
        url: finalUrl,
        requestHeaders: finalHeaders,
        requestBody: finalBody,
        statusCode: 0,
        latencyMs: 0,
        status: 'success',
        timestamp: new Date().toISOString(),
    };
    try {
        const fetchOptions = {
            method: step.method || 'GET',
            headers: Object.keys(finalHeaders).length > 0 ? finalHeaders : undefined,
            body: finalBody,
        };
        const response = await fetch(finalUrl, fetchOptions);
        const latencyMs = Date.now() - stepStartTime;
        stepTelemetry.latencyMs = latencyMs;
        stepTelemetry.statusCode = response.status;
        // Convert response headers to simple record
        const respHeadersObj = {};
        response.headers.forEach((val, key) => {
            respHeadersObj[key] = val;
        });
        stepTelemetry.responseHeaders = respHeadersObj;
        // Parse response body text
        let responseText = '';
        try {
            responseText = await response.text();
            if (responseText.length > 5000) {
                stepTelemetry.responseSnippet = responseText.substring(0, 5000) + '\n... (truncated for telemetry display)';
            }
            else {
                stepTelemetry.responseSnippet = responseText;
            }
            // Try parsing JSON body for output telemetry
            try {
                stepTelemetry.responseBody = JSON.parse(responseText);
            }
            catch {
                stepTelemetry.responseBody = responseText;
            }
        }
        catch {
            stepTelemetry.responseSnippet = '[Binary / Non-text Response Payload]';
        }
        // Determine status based on expected status code
        const expected = step.expectedStatusCode || 200;
        const isSuccess = response.status === expected ||
            (expected === 200 && response.status === 201) ||
            (expected === 201 && response.status === 200) ||
            (response.status >= 200 && response.status < 300 && (!step.expectedStatusCode || step.expectedStatusCode === 200 || step.expectedStatusCode === 201));
        if (!isSuccess) {
            stepTelemetry.status = 'failed';
            stepTelemetry.errorMessage = `Status code mismatch: Expected ${expected}, received ${response.status}`;
        }
        else {
            stepTelemetry.status = 'success';
        }
        // Capture response cookies
        if (step.captureCookies !== false) {
            const capturedCookies = parseSetCookieHeaders(response.headers);
            if (Object.keys(capturedCookies).length > 0) {
                stepTelemetry.capturedCookies = capturedCookies;
            }
        }
        // Extract dynamic variables via JSONPath / dot notation
        if (step.extractVariables && Array.isArray(step.extractVariables) && responseText) {
            const extracted = {};
            try {
                const jsonParsed = typeof stepTelemetry.responseBody === 'object' ? stepTelemetry.responseBody : JSON.parse(responseText);
                for (const ext of step.extractVariables) {
                    if (!ext.varName)
                        continue;
                    const val = getValueByPath(jsonParsed, ext.jsonPath);
                    if (val !== undefined && val !== null) {
                        extracted[ext.varName] = typeof val === 'object' ? JSON.stringify(val) : String(val);
                    }
                }
            }
            catch { }
            if (Object.keys(extracted).length > 0) {
                stepTelemetry.extractedVars = extracted;
            }
        }
        return stepTelemetry;
    }
    catch (err) {
        const latencyMs = Date.now() - stepStartTime;
        stepTelemetry.latencyMs = latencyMs;
        stepTelemetry.status = 'error';
        stepTelemetry.statusCode = 0;
        stepTelemetry.errorMessage = err?.message || 'Failed to execute Cloudflare edge API request';
        return stepTelemetry;
    }
}
/**
 * Multi-Step Workflow Runner for Cloudflare Edge Workers
 */
export async function executeWorkflowFlow(steps, workflowName = 'Workflow Journey', initialVariables = {}, initialCookies = {}) {
    const startTime = Date.now();
    const stepLogs = [];
    let variablesContext = { ...initialVariables };
    let cookiesContext = { ...initialCookies };
    let overallStatus = 'success';
    for (let idx = 0; idx < steps.length; idx++) {
        const step = steps[idx];
        if (step.skipped) {
            const skippedTelemetry = {
                stepIndex: idx + 1,
                stepId: step.stepId,
                stepName: step.name,
                method: step.method,
                url: step.url,
                requestHeaders: step.headers || {},
                statusCode: 0,
                responseBody: '',
                responseSnippet: '',
                latencyMs: 0,
                status: 'skipped',
                errorMessage: 'Step skipped by user',
                timestamp: new Date().toISOString(),
            };
            stepLogs.push(skippedTelemetry);
            continue;
        }
        const stepResult = await executeSingleStep(step, variablesContext, cookiesContext);
        stepResult.stepIndex = idx + 1;
        // Merge extracted variables and captured cookies into execution context
        if (stepResult.extractedVars) {
            variablesContext = { ...variablesContext, ...stepResult.extractedVars };
        }
        if (stepResult.capturedCookies) {
            cookiesContext = { ...cookiesContext, ...stepResult.capturedCookies };
        }
        if (stepResult.status === 'failed' || stepResult.status === 'error') {
            overallStatus = 'failed';
        }
        stepLogs.push(stepResult);
    }
    const finishedAt = new Date().toISOString();
    const totalTimeMs = Date.now() - startTime;
    return {
        workflowName,
        startedAt: new Date(startTime).toISOString(),
        finishedAt,
        totalTimeMs,
        totalSteps: steps.length,
        successSteps: stepLogs.filter((s) => s.status === 'success').length,
        failedSteps: stepLogs.filter((s) => s.status === 'failed' || s.status === 'error').length,
        overallStatus,
        steps: stepLogs,
    };
}
