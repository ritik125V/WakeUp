import axios from 'axios';

export interface IScannedEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';
  path: string;
  sourceFile: string;
  line: number;
  framework: string;
  suggestedBody?: string;
  expectedStatus?: number;
}

/**
 * Parses raw code content to extract API endpoint route definitions
 */
export function extractEndpointsFromCode(content: string, filePath: string): IScannedEndpoint[] {
  const endpoints: IScannedEndpoint[] = [];
  const lines = content.split('\n');

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

/**
 * Helper to build GitHub API headers with clean PAT token
 */
function buildGithubHeaders(token?: string): Record<string, string> {
  const cleanToken = token ? token.trim().replace(/^['"`]+|['"`]+$/g, '').replace(/^(Bearer|token)\s+/i, '') : '';
  const headers: Record<string, string> = {
    'User-Agent': 'WakeUp-Monitoring-App',
    'Accept': 'application/vnd.github+json',
  };
  if (cleanToken) {
    headers['Authorization'] = `Bearer ${cleanToken}`;
  }
  return headers;
}

/**
 * Helper to resolve the active branch for a repo if the specified branch fails
 */
async function getEffectiveBranch(owner: string, repo: string, headers: Record<string, string>, requestedBranch: string): Promise<string> {
  // First try requested branch
  try {
    await axios.get(`https://api.github.com/repos/${owner}/${repo}/branches/${requestedBranch}`, { headers, timeout: 5000 });
    return requestedBranch;
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 401) {
      throw new Error('GitHub Personal Access Token is invalid or expired.');
    } else if (status === 403) {
      throw new Error('GitHub API access forbidden. Ensure your PAT token has the "repo" scope enabled for private repositories.');
    }

    // Try repository default_branch
    try {
      const repoRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, { headers, timeout: 5000 });
      if (repoRes.data?.default_branch) {
        return repoRes.data.default_branch;
      }
    } catch (repoErr: any) {
      const repoStatus = repoErr?.response?.status;
      if (repoStatus === 401) {
        throw new Error('GitHub Personal Access Token is invalid or expired.');
      } else if (repoStatus === 404) {
        throw new Error(`GitHub repository "${owner}/${repo}" not found or private. For private repos, ensure your PAT token has the "repo" scope enabled.`);
      }
    }
    return requestedBranch === 'main' ? 'master' : 'main';
  }
}

/**
 * Scans a GitHub repository for code files containing route/API endpoints
 */
export async function scanGithubRepositoryEndpoints(
  repoFullName: string,
  token?: string,
  targetFiles?: string[],
  branch: string = 'main'
): Promise<IScannedEndpoint[]> {
  const [owner, repo] = repoFullName.split('/');
  if (!owner || !repo) {
    throw new Error('Invalid repository full name format. Expected owner/repo.');
  }

  const headers = buildGithubHeaders(token);
  const activeBranch = await getEffectiveBranch(owner, repo, headers, branch);
  const allScannedEndpoints: IScannedEndpoint[] = [];

  // If user provided specific files, fetch only those
  if (targetFiles && targetFiles.length > 0) {
    for (const filePath of targetFiles) {
      const cleanPath = filePath.trim().replace(/^\//, '');
      if (!cleanPath) continue;
      try {
        const fileRes = await axios.get(
          `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}?ref=${activeBranch}`,
          { headers, timeout: 10000 }
        );
        let rawContent = '';
        if (fileRes.data.content && fileRes.data.encoding === 'base64') {
          rawContent = Buffer.from(fileRes.data.content, 'base64').toString('utf-8');
        } else if (typeof fileRes.data === 'string') {
          rawContent = fileRes.data;
        }
        if (rawContent) {
          const found = extractEndpointsFromCode(rawContent, cleanPath);
          allScannedEndpoints.push(...found);
        }
      } catch (err: any) {
        console.error(`Failed to fetch file ${cleanPath} from GitHub:`, err?.message);
      }
    }
    return allScannedEndpoints;
  }

  // Otherwise, query GitHub Repository Git Tree to find all code & API route files
  try {
    const treeRes = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${activeBranch}?recursive=1`,
      { headers, timeout: 10000 }
    );

    const tree = Array.isArray(treeRes.data?.tree) ? treeRes.data.tree : [];
    
    // Filter candidate code files likely to contain API routes
    const candidateFiles = tree.filter((item: any) => {
      if (item.type !== 'blob') return false;
      const path = item.path.toLowerCase();
      return (
        path.includes('route') ||
        path.includes('api') ||
        path.includes('controller') ||
        path.includes('server') ||
        path.includes('app') ||
        path.includes('index') ||
        path.endsWith('swagger.json') ||
        path.endsWith('openapi.json') ||
        path.endsWith('openapi.yaml')
      );
    }).slice(0, 15); // limit to 15 key files for performance & rate limits

    for (const item of candidateFiles) {
      try {
        const fileRes = await axios.get(
          `https://api.github.com/repos/${owner}/${repo}/contents/${item.path}?ref=${activeBranch}`,
          { headers, timeout: 8000 }
        );
        let rawContent = '';
        if (fileRes.data.content && fileRes.data.encoding === 'base64') {
          rawContent = Buffer.from(fileRes.data.content, 'base64').toString('utf-8');
        }
        if (rawContent) {
          const found = extractEndpointsFromCode(rawContent, item.path);
          allScannedEndpoints.push(...found);
        }
      } catch (fileErr: any) {
        console.error(`Error scanning file ${item.path}:`, fileErr?.message);
      }
    }
  } catch (treeErr: any) {
    const status = treeErr?.response?.status;
    console.error('Error fetching git tree from GitHub:', treeErr?.response?.data || treeErr?.message);
    if (status === 404) {
      throw new Error(`Repository "${repoFullName}" or branch "${activeBranch}" not found. For private repos, ensure your PAT token has the "repo" scope enabled.`);
    } else if (status === 401 || status === 403) {
      throw new Error(`GitHub API rate limit or authentication error. Please provide a valid PAT token with "repo" scope.`);
    }
    throw new Error(`Failed to fetch repository tree: ${treeErr?.response?.data?.message || treeErr?.message}`);
  }

  return allScannedEndpoints;
}

/**
 * Lists code files in a GitHub repo tree that are candidates for API route scanning
 */
export async function listGithubRepoFiles(
  repoFullName: string,
  token?: string,
  branch: string = 'main'
): Promise<{ path: string; size?: number }[]> {
  const [owner, repo] = repoFullName.split('/');
  if (!owner || !repo) {
    throw new Error('Invalid repository full name format. Expected owner/repo.');
  }

  const headers = buildGithubHeaders(token);
  const activeBranch = await getEffectiveBranch(owner, repo, headers, branch);

  try {
    const treeRes = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${activeBranch}?recursive=1`,
      { headers, timeout: 10000 }
    );

    const tree = Array.isArray(treeRes.data?.tree) ? treeRes.data.tree : [];
    
    // Filter to code and spec files
    return tree
      .filter((item: any) => {
        if (item.type !== 'blob') return false;
        const p = item.path.toLowerCase();
        return (
          p.endsWith('.ts') ||
          p.endsWith('.js') ||
          p.endsWith('.py') ||
          p.endsWith('.go') ||
          p.endsWith('.json') ||
          p.endsWith('.yaml') ||
          p.endsWith('.yml') ||
          p.endsWith('.jsx') ||
          p.endsWith('.tsx')
        ) && !p.includes('node_modules') && !p.includes('.git/') && !p.includes('dist/') && !p.includes('build/');
      })
      .map((item: any) => ({
        path: item.path,
        size: item.size,
      }));
  } catch (err: any) {
    const status = err?.response?.status;
    console.error('Error listing repo files from GitHub:', err?.response?.data || err?.message);
    if (status === 404) {
      throw new Error(`Repository "${repoFullName}" or branch "${activeBranch}" not found. For private repos, ensure your PAT token has the "repo" scope enabled.`);
    } else if (status === 401) {
      throw new Error('GitHub Personal Access Token is invalid or expired.');
    } else if (status === 403) {
      throw new Error('GitHub API rate limit or permission error. Ensure your PAT token has "repo" scope (Classic) or "Contents: Read-only" (Fine-Grained).');
    }
    throw new Error(err?.response?.data?.message || err?.message || 'Failed to list repository files from GitHub.');
  }
}


