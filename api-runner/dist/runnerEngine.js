"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getValueByPath = getValueByPath;
exports.interpolateVariables = interpolateVariables;
exports.parseSetCookieHeaders = parseSetCookieHeaders;
exports.executeSingleStep = executeSingleStep;
exports.executeWorkflowFlow = executeWorkflowFlow;
const axios_1 = __importDefault(require("axios"));
/**
 * Utility to extract value from nested object by dot notation path
 */
function getValueByPath(obj, path) {
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
function interpolateVariables(template = '', variablesContext = {}) {
    if (!template)
        return template;
    return template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, varName) => {
        return variablesContext[varName] !== undefined ? variablesContext[varName] : `{{${varName}}}`;
    });
}
/**
 * Parses set-cookie headers from HTTP response into a cookie dictionary
 */
function parseSetCookieHeaders(setCookieHeaders) {
    const cookieDict = {};
    const headersArray = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
    for (const header of headersArray) {
        if (!header)
            continue;
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
/**
 * Core Step Execution Engine
 * Executes a single API step server-side via Node.js axios (Zero CORS restriction)
 */
async function executeSingleStep(step, variablesContext = {}, cookiesContext = {}) {
    const stepStartTime = Date.now();
    const finalUrl = interpolateVariables(step.url || '', variablesContext);
    // Interpolate query parameters
    const rawParams = step.queryParams || {};
    const finalParams = {};
    for (const [k, v] of Object.entries(rawParams)) {
        finalParams[interpolateVariables(k, variablesContext)] = interpolateVariables(v, variablesContext);
    }
    // Interpolate request headers
    const rawHeaders = step.headers || {};
    const finalHeaders = {};
    for (const [k, v] of Object.entries(rawHeaders)) {
        finalHeaders[interpolateVariables(k, variablesContext)] = interpolateVariables(v, variablesContext);
    }
    // Handle carried cookies across steps
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
    // Interpolate body payload
    let finalBody = undefined;
    if (step.bodyPayload && step.bodyPayload.trim() !== '') {
        const interpolatedBodyStr = interpolateVariables(step.bodyPayload, variablesContext);
        try {
            finalBody = JSON.parse(interpolatedBodyStr);
        }
        catch {
            finalBody = interpolatedBodyStr;
        }
    }
    const stepTelemetry = {
        stepIndex: 1,
        stepId: step.stepId || 'step-1',
        stepName: step.name || 'API Step',
        method: step.method || 'GET',
        url: finalUrl,
        requestHeaders: finalHeaders,
        requestBody: typeof finalBody === 'object' ? JSON.stringify(finalBody) : finalBody,
        statusCode: 0,
        latencyMs: 0,
        status: 'success',
        timestamp: new Date().toISOString(),
    };
    try {
        const response = await (0, axios_1.default)({
            method: step.method || 'GET',
            url: finalUrl,
            params: finalParams,
            headers: finalHeaders,
            data: finalBody,
            validateStatus: () => true, // Don't throw exception on 4xx/5xx status codes
            timeout: 15000,
        });
        const latencyMs = Date.now() - stepStartTime;
        stepTelemetry.latencyMs = latencyMs;
        stepTelemetry.statusCode = response.status;
        stepTelemetry.responseHeaders = response.headers;
        stepTelemetry.responseBody = response.data;
        // Format response snippet for UI telemetry display
        if (typeof response.data === 'object' && response.data !== null) {
            stepTelemetry.responseSnippet = JSON.stringify(response.data, null, 2);
        }
        else if (typeof response.data === 'string') {
            stepTelemetry.responseSnippet = response.data;
        }
        else {
            stepTelemetry.responseSnippet = String(response.data);
        }
        // Determine success based on expected status code
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
        // Capture response cookies if set
        if (step.captureCookies !== false) {
            const setCookieHeader = response.headers['set-cookie'];
            if (setCookieHeader) {
                const newCookies = parseSetCookieHeaders(setCookieHeader);
                stepTelemetry.capturedCookies = newCookies;
            }
        }
        // Extract dynamic variables via JSONPath / dot notation
        if (step.extractVariables && Array.isArray(step.extractVariables)) {
            const extracted = {};
            for (const ext of step.extractVariables) {
                if (!ext.varName)
                    continue;
                let val = undefined;
                if (typeof response.data === 'object' && response.data !== null) {
                    val = getValueByPath(response.data, ext.jsonPath);
                }
                else if (typeof response.data === 'string') {
                    try {
                        const jsonParsed = JSON.parse(response.data);
                        val = getValueByPath(jsonParsed, ext.jsonPath);
                    }
                    catch {
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
        return stepTelemetry;
    }
    catch (err) {
        const latencyMs = Date.now() - stepStartTime;
        stepTelemetry.latencyMs = latencyMs;
        stepTelemetry.status = 'error';
        stepTelemetry.statusCode = 0;
        stepTelemetry.errorMessage = err?.message || 'Failed to execute API step';
        return stepTelemetry;
    }
}
/**
 * Full Workflow Runner Engine
 * Executes all steps sequentially, carrying cookies and variables from step to step
 */
async function executeWorkflowFlow(steps, workflowName = 'Workflow Journey', initialVariables = {}, initialCookies = {}) {
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
        // Merge extracted variables and captured cookies into context
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
