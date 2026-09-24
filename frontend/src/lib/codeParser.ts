import { IScannedEndpoint } from './api';

/**
 * Client-side parser to extract API endpoints from local machine code files
 */
export function extractEndpointsFromCode(content: string, filePath: string): IScannedEndpoint[] {
  const endpoints: IScannedEndpoint[] = [];

  // 1. Check if file is OpenAPI / Swagger JSON
  if (filePath.endsWith('.json') && (content.includes('"openapi"') || content.includes('"swagger"'))) {
    try {
      const parsed = JSON.parse(content);
      const pathsObj = parsed.paths || {};
      for (const [apiPath, pathItem] of Object.entries(pathsObj)) {
        if (!pathItem || typeof pathItem !== 'object') continue;
        for (const [methodKey, operation] of Object.entries(pathItem as Record<string, any>)) {
          const method = methodKey.toUpperCase();
          if (['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'].includes(method)) {
            endpoints.push({
              method: method as any,
              path: apiPath,
              sourceFile: filePath,
              line: 1,
              framework: 'OpenAPI Spec',
              suggestedBody: method !== 'GET' ? '{\n  "example": "data"\n}' : '',
              expectedStatus: method === 'POST' ? 201 : 200,
            });
          }
        }
      }
      if (endpoints.length > 0) return endpoints;
    } catch {
      // fallback to regex if JSON parse fails
    }
  }

  // 2. Next.js App Router API Route detection (app/api/.../route.ts)
  if (filePath.includes('/api/') && (filePath.endsWith('route.ts') || filePath.endsWith('route.js'))) {
    const routePathMatch = filePath.match(/(?:app|pages)\/api\/(.+)\/route\.[jt]s$/);
    const apiPath = routePathMatch ? `/api/${routePathMatch[1]}` : '/api/route';
    const methodRegex = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE|HEAD)/g;
    let match;
    while ((match = methodRegex.exec(content)) !== null) {
      endpoints.push({
        method: match[1] as any,
        path: apiPath,
        sourceFile: filePath,
        line: content.substring(0, match.index).split('\n').length,
        framework: 'Next.js API Route',
        suggestedBody: match[1] === 'POST' || match[1] === 'PUT' ? '{\n  "key": "value"\n}' : '',
        expectedStatus: 200,
      });
    }
  }

  // 3. Express / Node.js / Fastify / NestJS regex: app.get('/route', ...), router.post('/route', ...)
  const expressRegex = /(?:app|router|server)\.(get|post|put|patch|delete|head)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  let matchExp;
  while ((matchExp = expressRegex.exec(content)) !== null) {
    const method = matchExp[1].toUpperCase() as any;
    const path = matchExp[2];
    const lineNum = content.substring(0, matchExp.index).split('\n').length;

    let bodyStr = '';
    if (method === 'POST' || method === 'PUT') {
      if (path.toLowerCase().includes('login') || path.toLowerCase().includes('auth')) {
        bodyStr = JSON.stringify({ email: 'user@example.com', password: 'password123' }, null, 2);
      } else {
        bodyStr = JSON.stringify({ name: 'Sample Payload', active: true }, null, 2);
      }
    }

    endpoints.push({
      method,
      path,
      sourceFile: filePath,
      line: lineNum,
      framework: 'Express.js / Node',
      suggestedBody: bodyStr,
      expectedStatus: method === 'POST' ? 201 : 200,
    });
  }

  // 4. Python Flask / FastAPI regex: @app.get('/route'), @router.post('/route')
  const pythonRegex = /@(?:app|router)\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  let matchPy;
  while ((matchPy = pythonRegex.exec(content)) !== null) {
    const method = matchPy[1].toUpperCase() as any;
    const path = matchPy[2];
    const lineNum = content.substring(0, matchPy.index).split('\n').length;
    endpoints.push({
      method,
      path,
      sourceFile: filePath,
      line: lineNum,
      framework: 'FastAPI / Flask',
      suggestedBody: method === 'POST' ? '{\n  "sample": "data"\n}' : '',
      expectedStatus: 200,
    });
  }

  // 5. Go Gin / Echo regex: r.GET("/path", ...), r.POST("/path", ...)
  const goRegex = /\.(GET|POST|PUT|PATCH|DELETE)\s*\(\s*['"`]([^'"`]+)['"`]/g;
  let matchGo;
  while ((matchGo = goRegex.exec(content)) !== null) {
    const method = matchGo[1].toUpperCase() as any;
    const path = matchGo[2];
    const lineNum = content.substring(0, matchGo.index).split('\n').length;
    endpoints.push({
      method,
      path,
      sourceFile: filePath,
      line: lineNum,
      framework: 'Go Gin / Echo',
      suggestedBody: method === 'POST' ? '{\n  "payload": "go_sample"\n}' : '',
      expectedStatus: 200,
    });
  }

  return endpoints;
}
