import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { CouponsModule } from '../coupons/coupons.module';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
    imports: [CouponsModule, InvoicesModule],
    controllers: [PaymentsController],
    providers: [PaymentsService],
})
export class PaymentsModule { }
