import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        AuthModule,
        ConfigModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET') || 'changeme',
                signOptions: { expiresIn: '30d' },
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [PortalController],
    providers: [PortalService],
})
export class PortalModule { }
