import { Injectable, NotFoundException, UnauthorizedException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PortalService {
    constructor(
        private prisma: PrismaService,
        private authService: AuthService,
        private jwtService: JwtService,
        @Inject('REDIS_CLIENT') private redis: Redis,
    ) { }

    // Google sign-in for clients — accept user info from OAuth2 flow, issue client JWT
    async clientGoogleLogin(userInfo: { email: string; name: string; picture?: string; googleId?: string }) {
        // Check ban status
        const isBanned = await this.redis.get(`client_banned:${userInfo.email}`);
        if (isBanned) throw new UnauthorizedException('Client account has been suspended.');

        const sessionId = uuidv4();

        // Issue a short-lived access token
        const accessToken = this.jwtService.sign(
            { sub: userInfo.googleId || userInfo.email, email: userInfo.email, name: userInfo.name, role: 'client', sid: sessionId },
            { expiresIn: '2h' }
        );

        // Issue a long-lived refresh token
        const refreshToken = this.jwtService.sign(
            { sub: userInfo.googleId || userInfo.email, email: userInfo.email, name: userInfo.name, role: 'client', sid: sessionId, type: 'refresh' },
            { expiresIn: '30d' }
        );

        // Store session in Redis
        const ttl = 7 * 24 * 60 * 60; // 7 days
        await this.redis.set(`client_session:${sessionId}`, userInfo.email, 'EX', ttl);
        await this.redis.sadd(`client_sessions:${userInfo.email}`, sessionId);
        await this.redis.expire(`client_sessions:${userInfo.email}`, ttl);

        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            user: { email: userInfo.email, name: userInfo.name, picture: userInfo.picture },
        };
    }

    // Refresh token
    async refreshClientToken(refreshToken: string) {
        if (!refreshToken) throw new UnauthorizedException('No refresh token provided');

        try {
            const payload = this.jwtService.verify(refreshToken);
            if (payload.type !== 'refresh' || payload.role !== 'client') throw new Error();

            // Verify session is active in Redis
            const email = await this.redis.get(`client_session:${payload.sid}`);
            if (!email) throw new UnauthorizedException('Session expired or revoked');

            // Issue new access token
            const accessToken = this.jwtService.sign(
                { sub: payload.sub, email: payload.email, name: payload.name, role: 'client', sid: payload.sid },
                { expiresIn: '15m' }
            );

            return { access_token: accessToken };
        } catch (e) {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    // Logout
    async clientLogout(sid: string, email: string) {
        if (sid) {
            await this.redis.del(`client_session:${sid}`);
            if (email) await this.redis.srem(`client_sessions:${email}`, sid);
        }
        return { success: true };
    }

    // Get all invoices for a client by their Google email
    async getClientInvoices(email: string) {
        const invoices = await this.prisma.invoice.findMany({
            where: { clientGoogleEmail: email },
            include: {
                items: true,
                transactions: { orderBy: { createdAt: 'desc' } },
                feedback: { orderBy: { submittedAt: 'desc' }, take: 1 },
            },
            orderBy: { createdAt: 'desc' },
        });

        return invoices.map((inv) => {
            const paidAmount = inv.transactions
                .filter((t) => t.status === 'success')
                .reduce((sum, t) => sum + Number(t.amount), 0);
            const remaining = Math.max(0, Number(inv.paymentAmount) - paidAmount);

            return {
                ...inv,
                paidAmount,
                remaining,
                lastRating: inv.feedback[0]?.rating ?? null,
            };
        });
    }

    // Get single invoice detail for client
    async getClientInvoiceDetail(token: string, email: string) {
        const inv = await this.prisma.invoice.findFirst({
            where: { paymentLinkToken: token, clientGoogleEmail: email },
            include: {
                items: true,
                transactions: { orderBy: { createdAt: 'desc' } },
                feedback: { orderBy: { submittedAt: 'desc' } },
            },
        });

        if (!inv) throw new NotFoundException('Invoice not found');

        const paidAmount = inv.transactions
            .filter((t) => t.status === 'success')
            .reduce((sum, t) => sum + Number(t.amount), 0);
        const remaining = Math.max(0, Number(inv.paymentAmount) - paidAmount);

        return { ...inv, paidAmount, remaining };
    }
}
