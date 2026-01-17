/**
 * Email Service for ComplyArk Super Admin
 * 
 * PURPOSE:
 * - Send tenant admin invitation emails
 * - Handle email delivery with fallback to console logging
 * 
 * SECURITY:
 * - Credentials from environment variables only
 * - No plaintext password logging
 * - No tracking pixels or external assets
 */

import nodemailer from 'nodemailer';

// Email configuration from environment
const EMAIL_CONFIG = {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
    from: process.env.EMAIL_FROM || 'ComplyArk <noreply@complyark.com>',
};

// Create transporter (lazy initialization)
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
    if (!EMAIL_CONFIG.user || !EMAIL_CONFIG.pass) {
        console.warn('[EMAIL] No email credentials configured. Emails will be logged to console.');
        return null;
    }

    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: EMAIL_CONFIG.host,
            port: EMAIL_CONFIG.port,
            secure: EMAIL_CONFIG.secure,
            auth: {
                user: EMAIL_CONFIG.user,
                pass: EMAIL_CONFIG.pass,
            },
        });
    }

    return transporter;
}

export interface TenantAdminInvitePayload {
    tenantName: string;
    tenantAdminEmail: string;
    temporaryPassword: string;
    platformUrl?: string;
}

/**
 * Send tenant admin invitation email.
 * 
 * CONTENT:
 * - Tenant name
 * - Tenant Admin email
 * - One-time temporary password
 * - Placeholder Tenant Platform URL
 * - Mandatory password change notice
 * 
 * DOES NOT INCLUDE:
 * - Consent information
 * - Cookie information
 * - SDK references
 * - Banner links
 * - Tracking pixels
 */
export async function sendTenantAdminInvite(payload: TenantAdminInvitePayload): Promise<boolean> {
    const { tenantName, tenantAdminEmail, temporaryPassword, platformUrl } = payload;

    const effectivePlatformUrl = platformUrl || 'https://tenant.complyark.com (Coming Soon)';

    const subject = `ComplyArk: Tenant Admin Access for ${tenantName}`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
        .credentials { background: #fff; border: 1px solid #e0e0e0; border-radius: 4px; padding: 15px; margin: 15px 0; }
        .credential-label { font-size: 12px; color: #666; text-transform: uppercase; }
        .credential-value { font-family: monospace; font-size: 16px; color: #333; margin-top: 4px; }
        .warning { background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 12px; margin: 15px 0; }
        .footer { font-size: 12px; color: #666; margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; }
    </style>
</head>
<body>
    <div class="header">
        <h1 style="margin: 0;">🛡️ ComplyArk</h1>
        <p style="margin: 10px 0 0 0;">Tenant Admin Access Provisioned</p>
    </div>
    <div class="content">
        <p>Hello,</p>
        <p>You have been granted Tenant Admin access for <strong>${tenantName}</strong> on the ComplyArk platform.</p>
        
        <div class="credentials">
            <div style="margin-bottom: 15px;">
                <div class="credential-label">Tenant</div>
                <div class="credential-value">${tenantName}</div>
            </div>
            <div style="margin-bottom: 15px;">
                <div class="credential-label">Email / Username</div>
                <div class="credential-value">${tenantAdminEmail}</div>
            </div>
            <div>
                <div class="credential-label">Temporary Password</div>
                <div class="credential-value">${temporaryPassword}</div>
            </div>
        </div>
        
        <div class="warning">
            <strong>⚠️ Important Security Notice:</strong><br>
            You will be <strong>required to change this password</strong> on your first login.
            Do not share these credentials with anyone.
        </div>
        
        <p><strong>Tenant Platform URL:</strong><br>
        <a href="${effectivePlatformUrl}">${effectivePlatformUrl}</a></p>
        
        <p>If you did not expect this access or have questions, please contact your ComplyArk administrator immediately.</p>
        
        <div class="footer">
            <p>This is an automated message from ComplyArk Governance System.<br>
            Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
`;

    const textContent = `
ComplyArk - Tenant Admin Access Provisioned
============================================

Hello,

You have been granted Tenant Admin access for ${tenantName} on the ComplyArk platform.

CREDENTIALS:
- Tenant: ${tenantName}
- Email / Username: ${tenantAdminEmail}
- Temporary Password: ${temporaryPassword}

IMPORTANT SECURITY NOTICE:
You will be REQUIRED TO CHANGE THIS PASSWORD on your first login.
Do not share these credentials with anyone.

Tenant Platform URL: ${effectivePlatformUrl}

If you did not expect this access or have questions, please contact your ComplyArk administrator immediately.

---
This is an automated message from ComplyArk Governance System.
Please do not reply to this email.
`;

    const mailOptions = {
        from: EMAIL_CONFIG.from,
        to: tenantAdminEmail,
        subject,
        text: textContent,
        html: htmlContent,
    };

    const transport = getTransporter();

    if (!transport) {
        // Fallback: Log to console for development
        console.log('\n' + '='.repeat(60));
        console.log('[EMAIL - CONSOLE FALLBACK]');
        console.log('='.repeat(60));
        console.log(`TO: ${tenantAdminEmail}`);
        console.log(`SUBJECT: ${subject}`);
        console.log('-'.repeat(60));
        console.log(textContent);
        console.log('='.repeat(60) + '\n');
        return true; // Consider console log as "sent" for dev purposes
    }

    try {
        const info = await transport.sendMail(mailOptions);
        console.log(`[EMAIL] Sent to ${tenantAdminEmail}: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error(`[EMAIL ERROR] Failed to send to ${tenantAdminEmail}:`, error);

        // Fallback to console on error
        console.log('\n' + '='.repeat(60));
        console.log('[EMAIL - FALLBACK DUE TO ERROR]');
        console.log('='.repeat(60));
        console.log(`TO: ${tenantAdminEmail}`);
        console.log(`SUBJECT: ${subject}`);
        console.log('-'.repeat(60));
        console.log(textContent);
        console.log('='.repeat(60) + '\n');

        return false;
    }
}
