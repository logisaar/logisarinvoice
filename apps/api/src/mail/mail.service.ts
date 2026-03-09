import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);
    private transporter: nodemailer.Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: Number(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
    }

    async sendPaymentLink(options: {
        to: string;
        clientName: string;
        businessName: string;
        invoiceNumber: string;
        paymentLabel: string;
        amount: number;
        dueDate: string;
        paymentLink: string;
    }) {
        const { to, clientName, businessName, invoiceNumber, paymentLabel, amount, dueDate, paymentLink } = options;

        const html = `
      <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px">
        <h2 style="color:#1e293b;margin-bottom:4px">${businessName}</h2>
        <p style="color:#64748b;font-size:14px;margin-top:0">Invoice ${invoiceNumber}</p>
        <hr style="border:none;border-top:1px solid #f1f5f9;margin:20px 0"/>
        <p style="color:#334155">Dear <strong>${clientName}</strong>,</p>
        <p style="color:#334155">Please find your quotation from <strong>${businessName}</strong>.</p>
        <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:20px 0">
          <p style="margin:4px 0;color:#64748b;font-size:13px">${paymentLabel}</p>
          <p style="margin:4px 0;font-size:24px;font-weight:700;color:#2563eb">₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          <p style="margin:4px 0;color:#64748b;font-size:13px">Due by ${dueDate}</p>
        </div>
        <a href="${paymentLink}" style="display:block;background:#2563eb;color:white;text-align:center;padding:14px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">
          Review &amp; Pay Now →
        </a>
        <p style="color:#94a3b8;font-size:12px;margin-top:20px;text-align:center">
          This is a secure payment link from ${businessName}
        </p>
      </div>`;

        try {
            await this.transporter.sendMail({
                from: process.env.SMTP_FROM || `"${businessName}" <noreply@paylink.com>`,
                to,
                subject: `${businessName} – ${paymentLabel} ${invoiceNumber}`,
                html,
            });
            this.logger.log(`Payment link email sent to ${to}`);
            return { success: true };
        } catch (err) {
            this.logger.error(`Failed to send email: ${err.message}`);
            return { success: false, error: err.message };
        }
    }
}
