import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/client.dto';
import { Redis } from 'ioredis';

@Injectable()
export class ClientsService {
    constructor(
        private prisma: PrismaService,
        @Inject('REDIS_CLIENT') private redis: Redis,
    ) { }

    findAll(userId: number) {
        return this.prisma.client.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    }

    async findAllGoogleUsers(userId: number) {
        // Capture every Google hit utilizing the ClientSession table
        const sessions = await this.prisma.clientSession.findMany({
            where: { invoice: { userId } },
            orderBy: { signedInAt: 'asc' }
        });

        const usersMap = new Map<string, any>();

        for (const session of sessions) {
            const email = session.googleEmail.toLowerCase();
            const name = session.googleName || 'Unknown';

            if (usersMap.has(email)) {
                const existing = usersMap.get(email);
                existing.invoices.add(session.invoiceId);
                existing.name = name;
                existing.lastActive = session.signedInAt;
            } else {
                usersMap.set(email, {
                    email,
                    name,
                    joinedAt: session.signedInAt,
                    lastActive: session.signedInAt,
                    invoices: new Set([session.invoiceId])
                });
            }
        }

        const usersArray = Array.from(usersMap.values()).map(u => ({
            ...u,
            invoicesCount: u.invoices.size,
            invoices: undefined
        })).sort((a, b) =>
            new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime()
        );

        for (const u of usersArray) {
            const isBanned = await this.redis.get(`client_banned:${u.email}`);
            u.isBanned = !!isBanned;
        }

        return usersArray;
    }

    async findGoogleUserByEmail(email: string, userId: number) {
        const sessions = await this.prisma.clientSession.findMany({
            where: {
                // Using case-insensitive match by bringing everything to lowercase in our code 
                // but for db query we try exact, since we saved exactly what google gave us
                googleEmail: email,
                invoice: { userId }
            },
            include: {
                invoice: {
                    include: { transactions: true, items: true }
                }
            },
            orderBy: { signedInAt: 'desc' }
        });

        if (!sessions.length) {
            return null;
        }

        const name = sessions[0].googleName || 'Unknown';

        // Extract unique invoices because a user might have multiple sessions per invoice
        const seenInvoices = new Set<number>();
        const invoices: any[] = [];
        let totalPaid = 0;

        for (const session of sessions) {
            if (!seenInvoices.has(session.invoice.id)) {
                seenInvoices.add(session.invoice.id);
                invoices.push(session.invoice);
                if (session.invoice.status === 'paid') {
                    totalPaid += Number(session.invoice.grandTotal);
                }
            }
        }

        const isBanned = !!(await this.redis.get(`client_banned:${email}`));

        return {
            email,
            name,
            totalPaid,
            isBanned,
            invoices
        };
    }

    async banGoogleUser(email: string, userId: number) {
        // verify they belong to this user by checking if they have sessions
        const hasSessions = await this.prisma.clientSession.findFirst({
            where: { googleEmail: email, invoice: { userId } }
        });
        if (!hasSessions) throw new NotFoundException('User not found in your clients list');

        // Ban in Redis
        await this.redis.set(`client_banned:${email}`, 'true');

        // Revoke active sessions
        const sids = await this.redis.smembers(`client_sessions:${email}`);
        if (sids.length) {
            await this.redis.del(...sids.map(sid => `client_session:${sid}`));
        }
        await this.redis.del(`client_sessions:${email}`);

        return { success: true, message: `Banned ${email}` };
    }

    async unbanGoogleUser(email: string, userId: number) {
        const hasSessions = await this.prisma.clientSession.findFirst({
            where: { googleEmail: email, invoice: { userId } }
        });
        if (!hasSessions) throw new NotFoundException('User not found in your clients list');

        await this.redis.del(`client_banned:${email}`);
        return { success: true, message: `Unbanned ${email}` };
    }

    findOne(id: number, userId: number) {
        return this.prisma.client.findFirst({ where: { id, userId } });
    }

    create(userId: number, dto: CreateClientDto) {
        return this.prisma.client.create({ data: { userId, ...dto } });
    }

    update(id: number, userId: number, dto: Partial<CreateClientDto>) {
        return this.prisma.client.updateMany({ where: { id, userId }, data: dto });
    }

    remove(id: number, userId: number) {
        return this.prisma.client.deleteMany({ where: { id, userId } });
    }
}
