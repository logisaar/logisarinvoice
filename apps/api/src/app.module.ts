import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { InvoicesModule } from './invoices/invoices.module';
import { ClientsModule } from './clients/clients.module';
import { CouponsModule } from './coupons/coupons.module';
import { PaymentsModule } from './payments/payments.module';
import { MailModule } from './mail/mail.module';
import { PortalModule } from './portal/portal.module';
import { RedisModule } from './redis.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    InvoicesModule,
    ClientsModule,
    CouponsModule,
    PaymentsModule,
    MailModule,
    PortalModule,
    RedisModule,
    SettingsModule,
  ],
})
export class AppModule { }
