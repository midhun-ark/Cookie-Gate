# Database Schema Design

## Table Explanations

### 1. super_admin
- **Purpose**: Holds the credentials and identity for the single Super Admin of the system.
- **Key Design**: No roles or permissions table because there is only one actor type at this stage.

### 2. tenants
- **Purpose**: Registry of organizations using the platform.
- **Key Design**: `status` field controls access. "Suspended" means a complete lockout. No hierarchy or complex relationships.

### 3. global_rules
- **Purpose**: Sources of truth for compliance configuration (e.g., "Must show banner in EU").
- **Key Design**: **Immutable**. To change rules, a new row is inserted with a higher `version`. `is_active` flag determines the current effective rule set. This allows for time-travel debugging of compliance states.

### 4. audit_logs
- **Purpose**: Indisputable record of who did what.
- **Key Design**: **Append-Only**. A PostgreSQL trigger (`prevent_audit_log_modification`) actively blocks any `UPDATE` or `DELETE` statements on this table to ensure legal admissibility.

### 5. incidents
- **Purpose**: Operational ticketing for compliance breaches or system alerts.
- **Key Design**: Simple lifecycle (Open -> Resolved). Data is never deleted to maintain history of issues.

## Intentionally Excluded
The following are **NOT** in this schema, as per strict governance-only scope:
- **End Users**: No table for user accounts, logins, or preferences.
- **Cookies**: No definitions, categories, or scanning results.
- **Consent Records**: No tracking of who consented to what.
- **Banners**: No configuration for UI appearance or text.
- **Scripts/SDKs**: No management of the JavaScript bundles.

## Safety & Stability
This schema is stable because it isolates the "Control Plane" (Super Admin) from the "Data Plane" (Traffic, Consent, Cookies). By decoupling governance from runtime mechanics, we ensure that:
1. **Security**: The Super Admin credentials and audit logs are not mixed with high-volume user data.
2. **Scalability**: High-throughput consent logging (future phase) will not lock or bloat the governance tables.
3. **Compliance**: The strict immutability of `global_rules` and `audit_logs` provides a solid foundation for legal audits without needing complex soft-delete logic or history tables yet.
