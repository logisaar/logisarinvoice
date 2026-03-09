import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SettingsService {
    constructor(private prisma: PrismaService) { }

    async getSettings(userId: number) {
        let settings = await this.prisma.businessSettings.findUnique({
            where: { userId },
        });

        if (!settings) {
            settings = await this.prisma.businessSettings.create({
                data: {
                    userId,
                    businessName: 'My Business',
                    invoicePrefix: 'INV',
                },
            });
        }

        return settings;
    }

    async updateSettings(userId: number, data: any) {
        return this.prisma.businessSettings.upsert({
            where: { userId },
            update: {
                businessName: data.businessName,
                businessAddress: data.businessAddress,
                gstNumber: data.gstNumber,
                email: data.businessEmail,
                phone: data.businessPhone,
                invoicePrefix: data.invoicePrefix,
                defaultNotes: data.defaultNotes,
                defaultTerms: data.defaultTerms,
            },
            create: {
                userId,
                businessName: data.businessName || 'My Business',
                businessAddress: data.businessAddress,
                gstNumber: data.gstNumber,
                email: data.businessEmail,
                phone: data.businessPhone,
                invoicePrefix: data.invoicePrefix || 'INV',
                defaultNotes: data.defaultNotes,
                defaultTerms: data.defaultTerms,
            },
        });
    }

    async updateLogoUrl(userId: number, logoUrl: string) {
        return this.prisma.businessSettings.upsert({
            where: { userId },
            update: { logoUrl },
            create: {
                userId,
                businessName: 'My Business',
                invoicePrefix: 'INV',
                logoUrl,
            },
        });
    }

    async deleteLogo(userId: number) {
        const settings = await this.prisma.businessSettings.findUnique({ where: { userId } });
        if (settings?.logoUrl) {
            // Remove old file from disk
            try {
                const filename = settings.logoUrl.split('/').pop();
                const filePath = path.resolve(process.cwd(), 'uploads', 'logos', filename!);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            } catch (_) { /* ignore disk errors, still clear DB */ }
        }
        return this.prisma.businessSettings.update({
            where: { userId },
            data: { logoUrl: null },
        });
    }

    /** Called before saving a new logo to delete the previous file */
    async removeOldLogoFile(userId: number) {
        const settings = await this.prisma.businessSettings.findUnique({ where: { userId } });
        if (settings?.logoUrl) {
            try {
                const filename = settings.logoUrl.split('/').pop();
                const filePath = path.resolve(process.cwd(), 'uploads', 'logos', filename!);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            } catch (_) { /* ignore */ }
        }
    }
}
