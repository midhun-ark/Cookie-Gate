# Tenant Platform Database Schema Design

## Overview

The Tenant Platform schema extends the existing ComplyArk governance schema with tenant-specific tables for website configuration, consent notices, purposes, and banner customization.

## Entity Relationship Diagram

```
tenants (existing)
    ├── tenant_users (existing)
    │
    └── websites
            ├── website_notices
            │       └── website_notice_translations
            │
            ├── purposes
            │       └── purpose_translations
            │
            ├── banner_customizations
            │
            └── tenant_audit_logs
```

## Tables

### 1. websites

Stores websites configured by tenant admins.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK to tenants |
| domain | VARCHAR(255) | Website domain |
| status | ENUM | DRAFT, ACTIVE, DISABLED |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |

**Key Constraints:**
- Unique constraint on (tenant_id, domain)
- Status can only be ACTIVE if:
  - English notice exists
  - At least one active purpose exists
  - All essential purposes have English translations

### 2. website_notices

Base table for consent notices (one per website).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| website_id | UUID | FK to websites (unique) |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |

### 3. website_notice_translations

Multi-language translations for notices.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| website_notice_id | UUID | FK to website_notices |
| language_code | VARCHAR(10) | ISO 639-1 code |
| title | VARCHAR(500) | Notice title |
| description | TEXT | Notice body |
| policy_url | VARCHAR(1000) | Privacy policy URL |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |

**DPDPA Compliance:**
- English (en) translation is mandatory
- Description must be clear and specific (min 50 chars)

### 4. purposes

Data processing purposes for each website.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| website_id | UUID | FK to websites |
| is_essential | BOOLEAN | Cannot be declined by user |
| status | ENUM | ACTIVE, INACTIVE |
| display_order | INTEGER | UI ordering |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |

**DPDPA Compliance:**
- Essential purposes cannot be inactive
- Essential purposes must have English translation

### 5. purpose_translations

Multi-language translations for purposes.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| purpose_id | UUID | FK to purposes |
| language_code | VARCHAR(10) | ISO 639-1 code |
| name | VARCHAR(255) | Purpose name |
| description | TEXT | Purpose description |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |

### 6. banner_customizations

Guarded banner customization settings.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| website_id | UUID | FK to websites (unique) |
| primary_color | VARCHAR(7) | Hex color |
| secondary_color | VARCHAR(7) | Hex color |
| background_color | VARCHAR(7) | Hex color |
| text_color | VARCHAR(7) | Hex color |
| accept_button_color | VARCHAR(7) | Must equal reject for DPDPA |
| reject_button_color | VARCHAR(7) | Must equal accept for DPDPA |
| accept_button_text | VARCHAR(100) | Button text |
| reject_button_text | VARCHAR(100) | Button text |
| customize_button_text | VARCHAR(100) | Button text |
| position | ENUM | bottom, top, center |
| layout | ENUM | banner, modal, popup |
| font_family | VARCHAR(100) | CSS font stack |
| font_size | VARCHAR(10) | e.g., 14px |
| focus_outline_color | VARCHAR(7) | Accessibility |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |

**DPDPA Dark Pattern Prevention:**
- Accept/Reject button colors MUST be identical
- Button text lengths should be similar
- No dismissive language (e.g., "maybe later")
- No persuasive language (e.g., "recommended")

### 7. tenant_audit_logs

Immutable audit log for tenant admin actions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK to tenants |
| actor_id | UUID | FK to tenant_users |
| action | VARCHAR(255) | Action performed |
| resource_type | VARCHAR(100) | Type of resource |
| resource_id | UUID | ID of resource |
| metadata | JSONB | Additional context |
| ip_address | INET | Client IP |
| user_agent | TEXT | Browser info |
| created_at | TIMESTAMP | Immutable timestamp |

**Protection:**
- PostgreSQL trigger prevents UPDATE and DELETE

### 8. supported_languages

Master list of supported languages.

| Column | Type | Description |
|--------|------|-------------|
| code | VARCHAR(10) | ISO 639-1 code (PK) |
| name | VARCHAR(100) | English name |
| native_name | VARCHAR(100) | Native name |
| is_rtl | BOOLEAN | Right-to-left |
| is_active | BOOLEAN | Enabled for use |
| created_at | TIMESTAMP | Creation time |

**Default Languages:**
- en (English) - Mandatory
- hi (Hindi), ta (Tamil), te (Telugu), bn (Bengali)
- mr (Marathi), gu (Gujarati), kn (Kannada)
- ml (Malayalam), pa (Punjabi), or (Odia)

## Indexes

Strategic indexes for query performance:

```sql
-- Websites
idx_websites_tenant_id (tenant_id)
idx_websites_status (status)

-- Notice translations
idx_notice_translations_notice_id (website_notice_id)
idx_notice_translations_language (language_code)

-- Purpose translations
idx_purpose_translations_purpose_id (purpose_id)
idx_purpose_translations_language (language_code)

-- Audit logs
idx_tenant_audit_logs_tenant (tenant_id)
idx_tenant_audit_logs_actor (actor_id)
idx_tenant_audit_logs_action (action)
idx_tenant_audit_logs_created (created_at)
idx_tenant_audit_logs_resource (resource_type, resource_id)
```

## Data Integrity

### Cascading Deletes
- website_notices → Cascade from websites
- website_notice_translations → Cascade from website_notices
- purposes → Cascade from websites
- purpose_translations → Cascade from purposes
- banner_customizations → Cascade from websites

### Referential Integrity
- tenant_audit_logs → RESTRICT delete on tenants and tenant_users
- websites → RESTRICT delete on tenants

## Migration Notes

Run migrations in order:
1. Ensure Admin Portal migrations are applied first
2. Apply tenant-platform-schema migration
3. Verify with `SELECT COUNT(*) FROM supported_languages;` (should return 11)
