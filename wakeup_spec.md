# WakeUp API Workflow Specification

## Step 1: User Signup / Register
- **Method**: POST
- **URL**: `{{baseUrl}}/api/auth/signup`
- **Headers**:
  - `Content-Type`: `application/json`
- **Expected Status**: 201
- **Body**:
```json
{
  "email": "testuser_123@example.com",
  "pin": "1234",
  "name": "Test User"
}
```
- **Extract Variables**:
  - `userId` from `$.user.id`
  - `authToken` from `$.token`
- **Carry Cookies**: true

---

## Step 2: User Login
- **Method**: POST
- **URL**: `{{baseUrl}}/api/auth/login`
- **Headers**:
  - `Content-Type`: `application/json`
- **Expected Status**: 200
- **Body**:
```json
{
  "email": "testuser_123@example.com",
  "pin": "1234"
}
```
- **Extract Variables**:
  - `authToken` from `$.token`
- **Carry Cookies**: true

---

## Step 3: Fetch User Profile
- **Method**: GET
- **URL**: `{{baseUrl}}/api/auth/me`
- **Headers**:
  - `Authorization`: `Bearer {{authToken}}`
- **Expected Status**: 200
- **Carry Cookies**: true

---

## Step 4: Create Resource Endpoint
- **Method**: POST
- **URL**: `{{baseUrl}}/api/endpoints`
- **Headers**:
  - `Authorization`: `Bearer {{authToken}}`
  - `Content-Type`: `application/json`
- **Expected Status**: 201
- **Body**:
```json
{
  "name": "TEST_RESOURCE_PING",
  "url": "{{baseUrl}}/api/health",
  "method": "GET",
  "expectedStatusCode": 200,
  "checkIntervalMinutes": 5
}
```
- **Extract Variables**:
  - `resourceId` from `$.endpoint._id`
- **Carry Cookies**: true

---

## Step 5: Test Action Trigger
- **Method**: POST
- **URL**: `{{baseUrl}}/api/endpoints/{{resourceId}}/trigger`
- **Headers**:
  - `Authorization`: `Bearer {{authToken}}`
- **Expected Status**: 200
- **Carry Cookies**: true

---

## Step 6: Create Test Workflow
- **Method**: POST
- **URL**: `{{baseUrl}}/api/workflows`
- **Headers**:
  - `Authorization`: `Bearer {{authToken}}`
  - `Content-Type`: `application/json`
- **Expected Status**: 201
- **Body**:
```json
{
  "name": "E2E Test Workflow",
  "description": "Automated workflow runner test sequence",
  "steps": [
    {
      "stepId": "step-1",
      "name": "Health Check Ping",
      "url": "{{baseUrl}}/api/health",
      "method": "GET",
      "expectedStatusCode": 200
    }
  ]
}
```
- **Extract Variables**:
  - `workflowId` from `$.workflow._id`
- **Carry Cookies**: true

---

## Step 7: Trigger Workflow Execution
- **Method**: POST
- **URL**: `{{baseUrl}}/api/workflows/{{workflowId}}/run`
- **Headers**:
  - `Authorization`: `Bearer {{authToken}}`
- **Expected Status**: 200
- **Carry Cookies**: true

---

## Step 8: Create Status Page
- **Method**: POST
- **URL**: `{{baseUrl}}/api/status-pages`
- **Headers**:
  - `Authorization`: `Bearer {{authToken}}`
  - `x-user-id`: `{{userId}}`
  - `Content-Type`: `application/json`
- **Expected Status**: 201
- **Body**:
```json
{
  "title": "E2E Test Status Page",
  "slug": "e2e-test-status-page",
  "description": "Public system status overview",
  "endpointIds": ["{{resourceId}}"]
}
```
- **Extract Variables**:
  - `statusPageId` from `$.statusPage._id`
  - `statusSlug` from `$.statusPage.slug`
- **Carry Cookies**: true

---

## Step 9: Edge Case - Invalid Auth Login
- **Method**: POST
- **URL**: `{{baseUrl}}/api/auth/login`
- **Headers**:
  - `Content-Type`: `application/json`
- **Expected Status**: 400
- **Body**:
```json
{
  "email": "testuser_123@example.com",
  "pin": "9999"
}
```
- **Carry Cookies**: false

---

## Step 10: Edge Case - Invalid Resource Lookup
- **Method**: GET
- **URL**: `{{baseUrl}}/api/endpoints/invalid_id_999`
- **Headers**:
  - `Authorization`: `Bearer {{authToken}}`
- **Expected Status**: 404
- **Carry Cookies**: true

---

## Step 11: Cleanup - Delete Created Status Page
- **Method**: DELETE
- **URL**: `{{baseUrl}}/api/status-pages/{{statusPageId}}`
- **Headers**:
  - `Authorization`: `Bearer {{authToken}}`
  - `x-user-id`: `{{userId}}`
- **Expected Status**: 200
- **Carry Cookies**: true

---

## Step 12: Cleanup - Delete Created Workflow
- **Method**: DELETE
- **URL**: `{{baseUrl}}/api/workflows/{{workflowId}}`
- **Headers**:
  - `Authorization`: `Bearer {{authToken}}`
- **Expected Status**: 200
- **Carry Cookies**: true

---

## Step 13: Cleanup - Delete Created Resource Endpoint
- **Method**: DELETE
- **URL**: `{{baseUrl}}/api/endpoints/{{resourceId}}`
- **Headers**:
  - `Authorization`: `Bearer {{authToken}}`
- **Expected Status**: 200
- **Carry Cookies**: true

---

## Step 14: Cleanup - Delete Test User Account
- **Method**: DELETE
- **URL**: `{{baseUrl}}/api/auth/me`
- **Headers**:
  - `Authorization`: `Bearer {{authToken}}`
- **Expected Status**: 200
- **Carry Cookies**: true

---

## AI Suggestions & Backend Readiness Audit
- Backend CORS Audit: Fix `origin: '*'` with `credentials: true` in `index.ts`. Browsers reject credentialed fetch requests when `Access-Control-Allow-Origin` is a wildcard `*`. Dynamically reflect request origin or supply an explicit array of allowed origins in `cors()` middleware.
- Data Cleanup Safeguard: Add automated cascade deletes for test endpoint, workflow, and status page records upon user deletion, and implement a dedicated `DELETE /api/auth/me` user teardown route in `auth.ts`.
- Rate Limiting: Implement `X-RateLimit-Limit` and `X-RateLimit-Remaining` headers on authentication endpoints (`/api/auth/login`, `/api/auth/signup`) using `express-rate-limit` to prevent automated brute-force attacks.
- Standardized Error Handling: Refactor 500 server error responses on invalid ObjectIDs (such as `/api/endpoints/invalid_id_999`) to return explicit 404 JSON payloads rather than crashing database queries with unhandled cast errors.
