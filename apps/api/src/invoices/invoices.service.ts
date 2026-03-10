import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto, UpdateInvoiceDto, UpdatePaymentDto, PaymentType } from './dto/invoice.dto';
import { AuthService } from '../auth/auth.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class InvoicesService {
    constructor(
        private prisma: PrismaService,
        private authService: AuthService,
    ) { }

    // ── Admin: list all invoices ───────────────────────────────────────────────
    async findAll(userId: number) {
        return this.prisma.invoice.findMany({
            where: { userId },
            include: { client: true, items: true, transactions: { orderBy: { createdAt: 'desc' }, take: 1 }, user: { include: { businessSettings: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }

    // ── Admin: single invoice details ─────────────────────────────────────────
    async findOne(id: number, userId: number) {
        const inv = await this.prisma.invoice.findFirst({
            where: { id, userId },
            include: { client: true, items: true, transactions: true, feedback: true, clientSessions: { orderBy: { signedInAt: 'desc' } }, user: { include: { businessSettings: true } } },
        });
        if (!inv) throw new NotFoundException('Invoice not found');
        return inv;
    }

    // ── Admin: create invoice ─────────────────────────────────────────────────
    async create(userId: number, dto: CreateInvoiceDto) {
        const { items, discountAmount = 0, paymentType = PaymentType.full } = dto;

        // Calculate totals
        let subtotal = 0, totalTax = 0;
        const processedItems = items.map((item) => {
            const baseAmount = Number(item.quantity) * Number(item.unitPrice);
            const taxAmount = (baseAmount * Number(item.taxPercent)) / 100;
            subtotal += baseAmount;
            totalTax += taxAmount;
            return {
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                taxPercent: item.taxPercent,
                taxAmount,
                amount: baseAmount + taxAmount,
            };
        });

        const grandTotal = subtotal + totalTax - discountAmount;
        const paymentAmount = paymentType === 'full' ? grandTotal : (dto.paymentAmount ?? grandTotal);

        // Find or create client record if email provided (optional)
        let clientId: number | undefined;
        if (dto.clientEmail && dto.clientId === 0) {
            const existingClient = await this.prisma.client.findFirst({
                where: { email: dto.clientEmail, userId },
            });
            if (existingClient) {
                clientId = existingClient.id;
                await this.prisma.client.update({
                    where: { id: existingClient.id },
                    data: {
                        name: dto.clientName ?? existingClient.name,
                        company: dto.clientCompany ?? existingClient.company,
                        phone: dto.clientPhone ?? existingClient.phone,
                    },
                });
            } else if (dto.clientName || dto.clientCompany) {
                const newClient = await this.prisma.client.create({
                    data: {
                        userId,
                        email: dto.clientEmail,
                        name: dto.clientName ?? dto.clientCompany ?? 'Client',
                        company: dto.clientCompany,
                        phone: dto.clientPhone,
                        address: dto.clientAddress,
                        gstNumber: dto.clientGST,
                    },
                });
                clientId = newClient.id;
            }
        } else if (dto.clientId && dto.clientId > 0) {
            clientId = dto.clientId;
        }

        const paymentLinkToken = uuidv4();

        return this.prisma.invoice.create({
            data: {
                invoiceNumber: dto.invoiceNumber,
                invoiceDate: new Date(dto.invoiceDate),
                dueDate: new Date(dto.dueDate),
                userId,
                clientId: clientId ?? null,
                subtotal,
                totalTax,
                discountAmount,
                grandTotal,
                paymentType: paymentType as any,
                paymentAmount,
                paymentLabel: dto.paymentLabel ?? 'Full Payment',
                paymentLinkToken,
                status: 'pending',
                notes: dto.notes,
                terms: dto.terms,
                // Store client info inline (for cases without a client record)
                clientGoogleName: dto.clientName,
                items: { create: processedItems },
            },
            include: { client: true, items: true, user: { include: { businessSettings: true } } },
        });
    }

    // ── Admin: update invoice ─────────────────────────────────────────────────
    async update(id: number, userId: number, dto: UpdateInvoiceDto) {
        const inv = await this.prisma.invoice.findFirst({ where: { id, userId } });
        if (!inv) throw new NotFoundException('Invoice not found');
        if (inv.status === 'paid') throw new Error('Cannot edit a paid invoice');

        const { items, discountAmount = 0, paymentType = PaymentType.full } = dto;

        // Calculate totals
        let subtotal = 0, totalTax = 0;
        const processedItems = items.map((item) => {
            const baseAmount = Number(item.quantity) * Number(item.unitPrice);
            const taxAmount = (baseAmount * Number(item.taxPercent)) / 100;
            subtotal += baseAmount;
            totalTax += taxAmount;
            return {
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                taxPercent: item.taxPercent,
                taxAmount,
                amount: baseAmount + taxAmount,
            };
        });

        const grandTotal = subtotal + totalTax - discountAmount;
        const paymentAmount = paymentType === 'full' ? grandTotal : (dto.paymentAmount ?? grandTotal);

        let clientId = inv.clientId;
        if (dto.clientEmail && dto.clientId === 0) {
            const existingClient = await this.prisma.client.findFirst({
                where: { email: dto.clientEmail, userId },
            });
            if (existingClient) {
                clientId = existingClient.id;
                await this.prisma.client.update({
                    where: { id: existingClient.id },
                    data: {
                        name: dto.clientName ?? existingClient.name,
                        company: dto.clientCompany ?? existingClient.company,
                        phone: dto.clientPhone ?? existingClient.phone,
                    },
                });
            } else if (dto.clientName || dto.clientCompany) {
                const newClient = await this.prisma.client.create({
                    data: {
                        userId,
                        email: dto.clientEmail,
                        name: dto.clientName ?? dto.clientCompany ?? 'Client',
                        company: dto.clientCompany,
                        phone: dto.clientPhone,
                        address: dto.clientAddress,
                        gstNumber: dto.clientGST,
                    },
                });
                clientId = newClient.id;
            }
        } else if (dto.clientId && dto.clientId > 0) {
            clientId = dto.clientId;
        }

        // Delete existing items
        await this.prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });

        // Update invoice and recreate items
        return this.prisma.invoice.update({
            where: { id },
            data: {
                invoiceNumber: dto.invoiceNumber,
                invoiceDate: new Date(dto.invoiceDate),
                dueDate: new Date(dto.dueDate),
                clientId: clientId ?? null,
                subtotal,
                totalTax,
                discountAmount,
                grandTotal,
                paymentType: paymentType as any,
                paymentAmount,
                paymentLabel: dto.paymentLabel ?? 'Full Payment',
                notes: dto.notes,
                terms: dto.terms,
                clientGoogleName: dto.clientName,
                items: { create: processedItems },
            },
            include: { client: true, items: true, user: { include: { businessSettings: true } } },
        });
    }

    // ── Admin: update payment amount/label (reshare same link) ────────────────
    async updatePayment(id: number, userId: number, dto: UpdatePaymentDto) {
        const inv = await this.prisma.invoice.findFirst({ where: { id, userId } });
        if (!inv) throw new NotFoundException('Invoice not found');
        return this.prisma.invoice.update({
            where: { id },
            data: { paymentAmount: dto.paymentAmount, paymentLabel: dto.paymentLabel },
        });
    }

    // ── Admin: delete invoice ─────────────────────────────────────────────────
    async remove(id: number, userId: number) {
        const inv = await this.prisma.invoice.findFirst({ where: { id, userId } });
        if (!inv) throw new NotFoundException('Invoice not found');
        await this.prisma.invoice.delete({ where: { id } });
        return { success: true };
    }

    // ── Public: get invoice by token (no auth) ────────────────────────────────
    async findPublicByToken(token: string) {
        const inv = await this.prisma.invoice.findUnique({
            where: { paymentLinkToken: token },
            include: { client: true, items: true, transactions: { orderBy: { createdAt: 'desc' }, take: 1 }, user: { include: { businessSettings: true } } },
        });
        if (!inv) throw new NotFoundException('Invoice not found');
        return inv;
    }

    // ── Public: client accepts quotation (Google OAuth2 or credential) ─────────────────
    async acceptQuotation(token: string, dto: any, authService: AuthService) {
        const inv = await this.findPublicByToken(token);

        // Resolve user identity: either from OAuth2 user info or from Google credential
        let googleUser: { email: string; name: string; picture?: string };
        if (dto.email) {
            // New flow: user info passed directly from oauth2.initTokenClient
            googleUser = { email: dto.email, name: dto.name || dto.email, picture: dto.picture };
        } else if (dto.credential) {
            // Legacy flow: verify Google credential (ID token)
            const verified = await authService.verifyGoogleCredential(dto.credential);
            googleUser = { email: verified.email, name: verified.name, picture: verified.picture };
        } else {
            throw new Error('No user identity provided');
        }

        await this.prisma.clientSession.upsert({
            where: { invoiceId_googleEmail: { invoiceId: inv.id, googleEmail: googleUser.email } },
            update: { googleName: googleUser.name, googlePicture: googleUser.picture },
            create: {
                invoiceId: inv.id,
                googleEmail: googleUser.email,
                googleName: googleUser.name,
                googlePicture: googleUser.picture,
            },
        });

        await this.prisma.invoice.update({
            where: { id: inv.id },
            data: {
                quotationAcceptedAt: new Date(),
            },
        });

        return { success: true, user: googleUser };
    }

    // ── Public: save pre-payment feedback ────────────────────────────────────
    async saveFeedback(
        token: string,
        rating: number,
        message: string | undefined,
        couponCode: string | undefined,
        discountApplied: number,
        finalAmount: number,
        googleEmail?: string,
    ) {
        const inv = await this.findPublicByToken(token);
        return this.prisma.quotationFeedback.create({
            data: {
                invoiceId: inv.id,
                googleEmail: googleEmail ?? inv.clientGoogleEmail,
                rating,
                message,
                couponCode,
                discountApplied,
                finalAmount,
            },
        });
    }
}
