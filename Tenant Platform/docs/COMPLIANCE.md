# DPDPA Compliance Rules Documentation

## Overview

The **Digital Personal Data Protection Act (DPDPA)** of India establishes rules for how personal data must be collected, processed, and protected. The ComplyArk Tenant Platform implements these rules at the configuration level to ensure that tenant websites comply with DPDPA requirements.

## Core Compliance Principles

### 1. Notice and Transparency

**Requirement**: Data fiduciaries must provide clear notice to data principals about data collection.

**Implementation**:
- Consent notices must have a minimum description length (50 characters)
- Notices must reference specific purposes
- English translation is mandatory; additional Indian languages are supported
- Policy URL can be linked for full privacy policy access

**Validation Rules**:
```
- Notice title: min 10 characters
- Notice description: min 50 characters
- English (en) translation: REQUIRED
- Policy URL: Valid URL format
```

### 2. Purpose Limitation

**Requirement**: Data must only be collected for specific, lawful purposes disclosed to the data principal.

**Implementation**:
- Each website must define explicit purposes
- Purposes are categorized as Essential or Non-Essential
- Users can see exactly what each purpose does
- Consent is tracked per purpose

**Validation Rules**:
```
- Purpose name: min 3 characters
- Purpose description: min 20 characters
- Essential purposes: CANNOT be declined by users
- Essential purposes: MUST have English translation
```

### 3. Essential Purpose Category

**Requirement**: Some data processing is necessary for the basic functioning of a service.

**Implementation**:
- Essential purposes are marked as `isEssential: true`
- Essential purposes cannot be:
  - Made inactive
  - Deleted
  - Changed to non-essential while website is active
- Essential purposes are always enabled in the consent banner
- Users are clearly informed that essential purposes cannot be disabled

**Examples of Essential Purposes**:
- Authentication cookies
- Shopping cart functionality
- Security measures
- Session management

### 4. Equal Prominence (Dark Pattern Prevention)

**Requirement**: DPDPA Section 5 prohibits "interface designs that impair the ability of a person to make an informed choice."

**Implementation - Banner Customization Guards**:

| Rule | Description | Enforcement |
|------|-------------|-------------|
| Equal Button Colors | Accept and Reject buttons must have identical colors | Validation error if different |
| Similar Button Text | Button text lengths should be within 50% of each other | Validation warning |
| No Dismissive Language | Reject button cannot use words like "maybe later", "skip", "close" | Validation error |
| No Persuasive Language | Accept button cannot use words like "recommended", "get started" | Validation error |
| No Pre-checks | Non-essential purposes cannot be pre-checked | Enforced by SDK (future) |

**Prohibited Button Text Examples**:
```
❌ "Maybe Later" vs "Accept All"
❌ "Skip" vs "Continue"
❌ "Not Now" vs "Enable All"
❌ "Got it" vs "Reject"
```

**Allowed Button Text Examples**:
```
✅ "Accept All" and "Reject All"
✅ "Allow Cookies" and "Deny Cookies"
✅ "I Agree" and "I Disagree"
```

### 5. Audit Trail

**Requirement**: Data fiduciaries must maintain records of processing activities.

**Implementation**:
- All configuration changes are logged to `tenant_audit_logs`
- Logs are append-only (enforced by database trigger)
- Logs include:
  - Actor (who made the change)
  - Action (what was done)
  - Resource (what was affected)
  - Timestamp (when it happened)
  - IP Address and User Agent (for forensics)

**Actions Logged**:
```
AUTH_LOGIN
AUTH_LOGOUT
AUTH_PASSWORD_RESET
WEBSITE_CREATED
WEBSITE_STATUS_ACTIVE
WEBSITE_STATUS_DISABLED
NOTICE_CREATED
NOTICE_TRANSLATION_UPDATED
PURPOSE_CREATED
PURPOSE_UPDATED
PURPOSE_TRANSLATIONS_UPDATED
BANNER_CREATED
BANNER_UPDATED
```

### 6. Website Activation Requirements

A website can only be activated (status = ACTIVE) when:

1. ✅ An English notice translation exists
2. ✅ At least one active purpose exists
3. ✅ All essential purposes have English translations
4. ✅ (Optional) Banner customization is configured

**Pre-activation Check Endpoint**:
```
GET /tenant/websites/:id/can-activate

Response:
{
  "canActivate": false,
  "reasons": [
    "Notice incomplete. DPO/Grievance Officer Email or Cookie Policy Link missing.",
    "At least one active purpose is required"
  ]
}
```

## Multi-Language Support

### Supported Languages

The platform supports the following languages, aligned with India's linguistic diversity:

| Code | Language | Native Name |
|------|----------|-------------|
| en | English | English |
| hi | Hindi | हिन्दी |
| ta | Tamil | தமிழ் |
| te | Telugu | తెలుగు |
| bn | Bengali | বাংলা |
| mr | Marathi | मराठी |
| gu | Gujarati | ગુજરાતી |
| kn | Kannada | ಕನ್ನಡ |
| ml | Malayalam | മലയാളം |
| pa | Punjabi | ਪੰਜਾਬੀ |
| or | Odia | ଓଡ଼ିଆ |

### Language Requirements

1. **English is mandatory** for all notices and essential purposes
2. Additional languages are optional but encouraged
3. If a translation is missing, the system falls back to English
4. RTL (Right-to-Left) languages are supported but none are currently active

## Data Retention

### Configuration Data
- Website configurations: Retained while website exists
- Translations: Retained with parent resource
- Banner settings: Retained with website

### Audit Logs
- Retention: Indefinite (compliance requirement)
- Deletion: Not allowed (immutable)
- Export: Available for compliance reporting

## Security Measures

### Authentication
- JWT tokens with 1-hour expiry
- HTTPOnly cookies for web clients
- Password hashing with bcrypt (10 salt rounds)
- Forced password reset on first login

### Authorization
- Tenant isolation enforced at all API endpoints
- Users can only access their tenant's data
- Actor ID logged for all changes

### Input Validation
- Zod schema validation on all inputs
- SQL injection protection via parameterized queries
- XSS protection via proper encoding

## Compliance Checklist for Tenants

Before activating a website:

- [ ] Create a clear, comprehensive consent notice
- [ ] Translate notice to English (mandatory)
- [ ] Define all data processing purposes
- [ ] Mark essential purposes correctly
- [ ] Translate all essential purposes to English
- [ ] Configure banner with DPDPA-compliant styling
- [ ] Review configuration in preview mode
- [ ] Verify activation requirements are met

## References

- [Digital Personal Data Protection Act, 2023](https://www.meity.gov.in/dpdp-bill-2023)
- [MEITY Guidelines on Consent Management](https://www.meity.gov.in)
- [UIDAI Guidelines on Data Protection](https://uidai.gov.in)
