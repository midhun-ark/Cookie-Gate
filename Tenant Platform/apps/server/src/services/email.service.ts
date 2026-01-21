/**
 * Email Service for Tenant Platform
 * 
 * Handles sending emails for:
 * - OTP verification for Data Principal requests
 * - Acknowledgement emails when request moves to Work in Progress
 * - Response emails when admin responds to request
 * 
 * Uses nodemailer with fallback to console logging for development
 */

import nodemailer from 'nodemailer';
import { config } from '../config';

// Email configuration from environment
const EMAIL_CONFIG = {
    host: process.env.EMAIL_HOST || '',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
    from: process.env.EMAIL_FROM || 'noreply@complyark.com',
};

// Lazy-initialized transporter
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

interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
    text: string;
}

async function sendEmail(options: SendEmailOptions): Promise<boolean> {
    const transport = getTransporter();

    if (!transport) {
        // Fallback: Log to console for development
        console.log('\n' + '='.repeat(60));
        console.log('[EMAIL - CONSOLE FALLBACK]');
        console.log('='.repeat(60));
        console.log(`TO: ${options.to}`);
        console.log(`SUBJECT: ${options.subject}`);
        console.log('-'.repeat(60));
        console.log(options.text);
        console.log('='.repeat(60) + '\n');
        return true;
    }

    try {
        const info = await transport.sendMail({
            from: EMAIL_CONFIG.from,
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options.html,
        });
        console.log(`[EMAIL] Sent to ${options.to}: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error(`[EMAIL ERROR] Failed to send to ${options.to}:`, error);
        return false;
    }
}

// ============================================================================
// OTP EMAIL
// ============================================================================

export interface OtpEmailPayload {
    email: string;
    otp: string;
    requestType: string;
    websiteDomain: string;
}

export async function sendOtpEmail(payload: OtpEmailPayload): Promise<boolean> {
    const { email, otp, requestType, websiteDomain } = payload;

    const subject = `Your Verification Code - ${requestType} Request`;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
        .otp-box { background: #fff; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
        .otp-code { font-family: monospace; font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; }
        .warning { background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 12px; margin: 15px 0; font-size: 14px; }
        .footer { font-size: 12px; color: #666; margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; }
    </style>
</head>
<body>
    <div class="header">
        <h1 style="margin: 0;">🛡️ ComplyArk</h1>
        <p style="margin: 10px 0 0 0;">Data Protection Request Verification</p>
    </div>
    <div class="content">
        <p>Hello,</p>
        <p>You have submitted a <strong>${requestType}</strong> request on <strong>${websiteDomain}</strong>.</p>
        <p>Please use the following verification code to confirm your request:</p>
        
        <div class="otp-box">
            <div class="otp-code">${otp}</div>
            <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">This code expires in 10 minutes</p>
        </div>
        
        <div class="warning">
            <strong>⚠️ Security Notice:</strong><br>
            If you did not submit this request, please ignore this email.
            Do not share this code with anyone.
        </div>
        
        <div class="footer">
            <p>This is an automated message from ComplyArk.<br>
            Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
`;

    const text = `
ComplyArk - Data Protection Request Verification
=================================================

Hello,

You have submitted a ${requestType} request on ${websiteDomain}.

Your verification code is: ${otp}

This code expires in 10 minutes.

SECURITY NOTICE:
If you did not submit this request, please ignore this email.
Do not share this code with anyone.

---
This is an automated message from ComplyArk.
Please do not reply to this email.
`;

    return sendEmail({ to: email, subject, html, text });
}

// ============================================================================
// ACKNOWLEDGEMENT EMAIL (when status changes to Work in Progress)
// ============================================================================

export interface AcknowledgementEmailPayload {
    email: string;
    requestId: string;
    requestNumber: string;
    requestType: string;
    websiteDomain: string;
}

export async function sendAcknowledgementEmail(payload: AcknowledgementEmailPayload): Promise<boolean> {
    const { email, requestNumber, requestType, websiteDomain } = payload;

    const subject = `Request Acknowledged - ${requestNumber}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
        .info-box { background: #e8f4fd; border-left: 4px solid #2196f3; padding: 15px; margin: 15px 0; }
        .footer { font-size: 12px; color: #666; margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; }
    </style>
</head>
<body>
    <div class="header">
        <h1 style="margin: 0;">🛡️ ComplyArk</h1>
        <p style="margin: 10px 0 0 0;">Request Acknowledgement</p>
    </div>
    <div class="content">
        <p>Hello,</p>
        <p>Your <strong>${requestType}</strong> request has been acknowledged and is now being processed.</p>
        
        <div class="info-box">
            <p style="margin: 0;"><strong>Request ID:</strong> ${requestNumber}</p>
            <p style="margin: 5px 0 0 0;"><strong>Website:</strong> ${websiteDomain}</p>
            <p style="margin: 5px 0 0 0;"><strong>Status:</strong> Work in Progress</p>
        </div>
        
        <p>You will receive updates via email as your request is processed.</p>
        
        <div class="footer">
            <p>This is an automated message from ComplyArk.<br>
            Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
`;

    const text = `
ComplyArk - Request Acknowledgement
===================================

Hello,

Your ${requestType} request has been acknowledged and is now being processed.

Request ID: ${requestNumber}
Website: ${websiteDomain}
Status: Work in Progress

You will receive updates via email as your request is processed.

---
This is an automated message from ComplyArk.
Please do not reply to this email.
`;

    return sendEmail({ to: email, subject, html, text });
}

// ============================================================================
// RESPONSE EMAIL (when admin responds)
// ============================================================================

export interface ResponseEmailPayload {
    email: string;
    requestNumber: string;
    requestType: string;
    outcome: 'FULFILLED' | 'PARTIALLY_FULFILLED' | 'REJECTED';
    reason: string;
    websiteDomain: string;
}

export async function sendResponseEmail(payload: ResponseEmailPayload): Promise<boolean> {
    const { email, requestNumber, requestType, outcome, reason, websiteDomain } = payload;

    const outcomeLabels: Record<string, string> = {
        FULFILLED: 'Fulfilled',
        PARTIALLY_FULFILLED: 'Partially Fulfilled',
        REJECTED: 'Rejected',
    };

    const outcomeColors: Record<string, string> = {
        FULFILLED: '#4caf50',
        PARTIALLY_FULFILLED: '#ff9800',
        REJECTED: '#f44336',
    };

    const subject = `Request ${outcomeLabels[outcome]} - ${requestNumber}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
        .outcome-box { background: #fff; border-left: 4px solid ${outcomeColors[outcome]}; padding: 15px; margin: 15px 0; }
        .reason-box { background: #f5f5f5; padding: 15px; border-radius: 4px; margin: 15px 0; }
        .footer { font-size: 12px; color: #666; margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; }
    </style>
</head>
<body>
    <div class="header">
        <h1 style="margin: 0;">🛡️ ComplyArk</h1>
        <p style="margin: 10px 0 0 0;">Request Response</p>
    </div>
    <div class="content">
        <p>Hello,</p>
        <p>Your <strong>${requestType}</strong> request has been reviewed and responded to.</p>
        
        <div class="outcome-box">
            <p style="margin: 0;"><strong>Request ID:</strong> ${requestNumber}</p>
            <p style="margin: 5px 0 0 0;"><strong>Website:</strong> ${websiteDomain}</p>
            <p style="margin: 5px 0 0 0;"><strong>Outcome:</strong> <span style="color: ${outcomeColors[outcome]}; font-weight: bold;">${outcomeLabels[outcome]}</span></p>
        </div>
        
        <div class="reason-box">
            <p style="margin: 0;"><strong>Response:</strong></p>
            <p style="margin: 10px 0 0 0;">${reason}</p>
        </div>
        
        <div class="footer">
            <p>If you have any questions, please contact the organization's Data Protection Officer.<br><br>
            This is an automated message from ComplyArk.<br>
            Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
`;

    const text = `
ComplyArk - Request Response
============================

Hello,

Your ${requestType} request has been reviewed and responded to.

Request ID: ${requestNumber}
Website: ${websiteDomain}
Outcome: ${outcomeLabels[outcome]}

Response:
${reason}

---
If you have any questions, please contact the organization's Data Protection Officer.

This is an automated message from ComplyArk.
Please do not reply to this email.
`;

    return sendEmail({ to: email, subject, html, text });
}

// ============================================================================
// UTILITY: Generate OTP
// ============================================================================

export function generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
