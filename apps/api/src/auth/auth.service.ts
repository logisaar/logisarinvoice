import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) { }

    // ── Admin email/password login ─────────────────────────────────────────────
    async login(email: string, password: string) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) throw new UnauthorizedException('Invalid credentials');

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) throw new UnauthorizedException('Invalid credentials');

        return this.issueToken(user);
    }

    // ── Verify Google credential (from GSI one-tap) for client sign-in ─────────
    async verifyGoogleCredential(credential: string) {
        try {
            const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
            const ticket = await googleClient.verifyIdToken({
                idToken: credential,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
            const payload = ticket.getPayload();
            if (!payload) throw new BadRequestException('Invalid Google token');
            return {
                email: payload.email!,
                name: payload.name || '',
                picture: payload.picture || '',
                googleId: payload.sub,
            };
        } catch {
            throw new BadRequestException('Google token verification failed');
        }
    }

    // ── Admin: get current user ────────────────────────────────────────────────
    async getMe(userId: number) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, email: true, role: true, createdAt: true },
        });
        return user;
    }

    // ── Issue JWT ──────────────────────────────────────────────────────────────
    private issueToken(user: { id: number; email: string; role: string }) {
        const payload = { sub: user.id, email: user.email, role: user.role };
        return {
            access_token: this.jwtService.sign(payload),
            user: { id: user.id, email: user.email, role: user.role },
        };
    }

    // ── Hash password (for seeding / user creation) ───────────────────────────
    async hashPassword(password: string) {
        return bcrypt.hash(password, 10);
    }
}
