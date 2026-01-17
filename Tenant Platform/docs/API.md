# Tenant Platform API Documentation

## Base URL

```
http://localhost:3001/tenant
```

## Authentication

All endpoints (except login) require authentication via:
- **Authorization Header**: `Bearer <token>`
- **Cookie**: `tenant_token=<token>`

JWT tokens expire after 1 hour.

---

## Authentication Endpoints

### POST /tenant/auth/login

Authenticate a tenant admin user.

**Request Body:**
```json
{
  "email": "admin@tenant.example.com",
  "password": "SecureP@ss123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "tenantId": "uuid",
      "email": "admin@tenant.example.com",
      "mustResetPassword": true,
      "status": "ACTIVE",
      "createdAt": "2024-01-17T12:00:00Z"
    },
    "tenant": {
      "id": "uuid",
      "name": "Example Corp",
      "status": "ACTIVE"
    },
    "token": "jwt-token-here",
    "mustResetPassword": true
  }
}
```

### POST /tenant/auth/logout

Logout and clear session.

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### POST /tenant/auth/force-reset-password

Reset password on first login (when `mustResetPassword` is true).

**Request Body:**
```json
{
  "newPassword": "NewSecureP@ss123",
  "confirmPassword": "NewSecureP@ss123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "new-jwt-token"
  },
  "message": "Password reset successfully"
}
```

### GET /tenant/auth/me

Get current user and tenant info.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "tenant": { ... }
  }
}
```

---

## Website Endpoints

### GET /tenant/websites

List all websites for the tenant.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "tenantId": "uuid",
      "domain": "example.com",
      "status": "DRAFT",
      "hasNotice": false,
      "purposeCount": 0,
      "hasEnglishNotice": false,
      "hasBanner": false,
      "createdAt": "2024-01-17T12:00:00Z",
      "updatedAt": "2024-01-17T12:00:00Z"
    }
  ]
}
```

### POST /tenant/websites

Create a new website.

**Request Body:**
```json
{
  "domain": "example.com"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "domain": "example.com",
    "status": "DRAFT"
  },
  "message": "Website created successfully"
}
```

### GET /tenant/websites/:id

Get a single website.

### PATCH /tenant/websites/:id

Update website status.

**Request Body:**
```json
{
  "status": "ACTIVE"
}
```

**Status Options:** `DRAFT`, `ACTIVE`, `DISABLED`

**Activation Requirements (for ACTIVE):**
- English notice translation exists
- At least one active purpose exists
- All essential purposes have English translations

### GET /tenant/websites/:id/can-activate

Check if website meets activation requirements.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "canActivate": false,
    "reasons": [
      "English notice translation is required",
      "At least one active purpose is required"
    ]
  }
}
```

### DELETE /tenant/websites/:id

Delete a website (only DRAFT status).

---

## Notice Endpoints

### GET /tenant/websites/:id/notices

Get notice for a website.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "websiteId": "uuid",
    "translations": [
      {
        "id": "uuid",
        "languageCode": "en",
        "title": "Cookie Consent Notice",
        "description": "We use cookies to enhance your browsing experience...",
        "policyUrl": "https://example.com/privacy"
      }
    ]
  }
}
```

### POST /tenant/websites/:id/notices

Create a notice with translations.

**Request Body:**
```json
{
  "translations": [
    {
      "languageCode": "en",
      "title": "Cookie Consent Notice",
      "description": "We use cookies to enhance your browsing experience. This includes essential cookies for site functionality and optional cookies for analytics and marketing. You can manage your preferences using the options below.",
      "policyUrl": "https://example.com/privacy"
    },
    {
      "languageCode": "hi",
      "title": "कुकी सहमति सूचना",
      "description": "हम आपके ब्राउज़िंग अनुभव को बेहतर बनाने के लिए कुकीज़ का उपयोग करते हैं...",
      "policyUrl": "https://example.com/privacy"
    }
  ]
}
```

**Requirements:**
- English (`en`) translation is mandatory
- Description must be at least 50 characters

### PATCH /tenant/notices/:noticeId/translations

Batch update translations.

**Request Body:**
```json
{
  "translations": [
    {
      "languageCode": "en",
      "title": "Updated Title",
      "description": "Updated description with at least 50 characters for DPDPA compliance...",
      "policyUrl": "https://example.com/privacy"
    }
  ]
}
```

### PUT /tenant/notices/:noticeId/translations/:languageCode

Add or update a single translation.

### DELETE /tenant/notices/:noticeId/translations/:languageCode

Delete a translation (cannot delete English).

---

## Purpose Endpoints

### GET /tenant/websites/:id/purposes

Get all purposes for a website.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "websiteId": "uuid",
      "isEssential": true,
      "status": "ACTIVE",
      "displayOrder": 0,
      "translations": [
        {
          "languageCode": "en",
          "name": "Essential Cookies",
          "description": "Required for the website to function properly"
        }
      ]
    }
  ]
}
```

### POST /tenant/websites/:id/purposes

Create a purpose.

**Request Body:**
```json
{
  "isEssential": false,
  "displayOrder": 1,
  "translations": [
    {
      "languageCode": "en",
      "name": "Analytics",
      "description": "We use analytics cookies to understand how visitors interact with our website"
    }
  ]
}
```

### GET /tenant/purposes/:purposeId

Get a single purpose.

### PATCH /tenant/purposes/:purposeId

Update a purpose.

**Request Body:**
```json
{
  "isEssential": false,
  "status": "INACTIVE",
  "displayOrder": 2
}
```

**Constraints:**
- Essential purposes cannot be made inactive
- Cannot change essential status while website is active

### PATCH /tenant/purposes/:purposeId/translations

Update purpose translations.

### DELETE /tenant/purposes/:purposeId

Delete a purpose (deactivates it).

**Constraints:**
- Cannot delete essential purposes
- Cannot delete while website is active

### POST /tenant/websites/:id/purposes/reorder

Reorder purposes.

**Request Body:**
```json
{
  "orders": [
    { "id": "purpose-uuid-1", "displayOrder": 0 },
    { "id": "purpose-uuid-2", "displayOrder": 1 },
    { "id": "purpose-uuid-3", "displayOrder": 2 }
  ]
}
```

---

## Banner Customization Endpoints

### GET /tenant/websites/:id/banner

Get banner customization (with defaults).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "primaryColor": "#0066CC",
    "secondaryColor": "#666666",
    "backgroundColor": "#FFFFFF",
    "textColor": "#333333",
    "acceptButtonColor": "#0066CC",
    "rejectButtonColor": "#0066CC",
    "acceptButtonText": "Accept All",
    "rejectButtonText": "Reject All",
    "customizeButtonText": "Customize",
    "position": "bottom",
    "layout": "banner",
    "fontFamily": "system-ui, -apple-system, sans-serif",
    "fontSize": "14px",
    "focusOutlineColor": "#005299"
  }
}
```

### POST /tenant/websites/:id/banner

Create or update banner customization.

**Request Body:**
```json
{
  "primaryColor": "#1E40AF",
  "backgroundColor": "#F8FAFC",
  "textColor": "#1E293B",
  "acceptButtonColor": "#1E40AF",
  "rejectButtonColor": "#1E40AF",
  "acceptButtonText": "Accept All",
  "rejectButtonText": "Reject All",
  "customizeButtonText": "Manage Preferences",
  "position": "bottom",
  "layout": "banner"
}
```

**DPDPA Dark Pattern Prevention:**
- `acceptButtonColor` must equal `rejectButtonColor`
- Button text lengths should be similar
- Reject text cannot use: "maybe later", "skip", "close"
- Accept text cannot use: "get started", "recommended"

### PATCH /tenant/websites/:id/banner

Partial update banner customization.

### POST /tenant/websites/:id/banner/reset

Reset banner to defaults.

### GET /tenant/websites/:id/banner/preview

Get HTML preview of the banner.

**Response:** `text/html`

---

## Audit Log Endpoints

### GET /tenant/audit-logs

Get audit logs with pagination and filters.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (1-100, default: 20) |
| action | string | Filter by action |
| resourceType | string | Filter by resource type |
| resourceId | uuid | Filter by resource ID |
| startDate | ISO date | Filter from date |
| endDate | ISO date | Filter to date |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "tenantId": "uuid",
      "actorId": "uuid",
      "actorEmail": "admin@tenant.example.com",
      "action": "WEBSITE_CREATED",
      "resourceType": "website",
      "resourceId": "uuid",
      "metadata": { "domain": "example.com" },
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2024-01-17T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### GET /tenant/audit-logs/filters

Get available filter options.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "actions": [
      "AUTH_LOGIN",
      "WEBSITE_CREATED",
      "NOTICE_CREATED"
    ],
    "resourceTypes": [
      "website",
      "notice",
      "purpose",
      "banner"
    ]
  }
}
```

### GET /tenant/audit-logs/export

Export audit logs as CSV.

**Response:** `text/csv` file download

---

## Language Endpoints

### GET /tenant/languages

Get all supported languages.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "code": "en",
      "name": "English",
      "nativeName": "English",
      "isRtl": false,
      "isActive": true
    },
    {
      "code": "hi",
      "name": "Hindi",
      "nativeName": "हिन्दी",
      "isRtl": false,
      "isActive": true
    }
  ]
}
```

### GET /tenant/languages/:code

Get a specific language.

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "fieldName",
      "message": "Validation error message"
    }
  ]
}
```

### Common HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request / Validation Error |
| 401 | Unauthorized |
| 403 | Forbidden / Password Reset Required |
| 404 | Not Found |
| 409 | Conflict (duplicate) |
| 500 | Internal Server Error |

### Password Reset Required (403)

When `mustResetPassword` is true:
```json
{
  "success": false,
  "message": "Password reset required",
  "code": "PASSWORD_RESET_REQUIRED"
}
```

---

## DPDPA Compliance Notes

1. **English Required**: All notices and essential purposes must have English translations.

2. **Dark Pattern Prevention**:
   - Accept/Reject buttons must have identical colors
   - Button text must be similar in length
   - No dismissive language for Reject
   - No persuasive language for Accept

3. **Essential Purposes**: Cannot be deactivated or deleted.

4. **Audit Trail**: All configuration changes are immutably logged.

5. **Website Activation**: Requires complete configuration before going live.
