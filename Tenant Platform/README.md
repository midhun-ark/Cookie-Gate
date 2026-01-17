# ComplyArk Tenant Platform

The **Tenant Platform** is the customer-facing side of ComplyArk, allowing organizations to manage cookie consent, privacy notices, and DPDPA compliance for their websites.

## 🌟 Key Features

- **Multi-Website Management**: Configure consent for multiple domains.
- **DPDPA Compliance**: Built-in guardrails against dark patterns and non-compliant configurations.
- **Multi-Language Support**: Manage notices and purposes in English (mandatory) and Indian languages.
- **Audit Logging**: Immutable logs of all configuration changes for regulatory compliance.
- **Secure Authentication**: Tenant isolation and enforced security practices.

## 📚 Documentation

- [**Developer Guide**](./DEVELOPER_GUIDE.md): Instructions for running, building, and testing the platform.
- [**API Documentation**](./docs/API.md): Detailed API endpoints and usage.
- [**Compliance Rules**](./docs/COMPLIANCE.md): Explanation of DPDPA rules enforced by the system.
- [**Database Schema**](./apps/server/SCHEMA_DESIGN.md): Database architecture and ER diagram.

## 🚀 Getting Started

1. **Start Database**: `docker-compose up -d` (in `Admin Portal` directory)
2. **Start Backend**: `npm run dev` (in `apps/server`)
3. **Start Frontend**: `npm run dev` (in `apps/tenant-ui`)

See [Developer Guide](./DEVELOPER_GUIDE.md) for detailed setup instructions.
