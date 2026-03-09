import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                ExtractJwt.fromAuthHeaderAsBearerToken(),
                (req: any) => {
                    let token = null;
                    if (req && req.cookies) token = req.cookies['access_token'];
                    return token;
                },
            ]),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET') || 'changeme',
        });
    }

    async validate(payload: { sub: any; email: string; role: string; name?: string; sid?: string }) {
        // Client portal: JWT is self-validating (signature + expiration).
        // Ban checks happen at login time in portal.service.ts — no Redis check per request.
        if (payload.role === 'client') {
            if (!payload.email) throw new UnauthorizedException('Invalid token');
            return { id: payload.sub, email: payload.email, role: payload.role, name: payload.name, sid: payload.sid };
        }

        // Admin: verify user still exists in DB
        const user = await this.prisma.user.findUnique({ where: { id: Number(payload.sub) } });
        if (!user) throw new UnauthorizedException();
        return { id: user.id, email: user.email, role: user.role, name: user.name };
    }
}
