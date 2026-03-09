import { Controller, Post, Body, Req, Res } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import type { Request, Response } from 'express';
import { PaymentsInitiateDto } from './dto/payments-initiate.dto';

@Controller('payments')
export class PaymentsController {
    constructor(private paymentsService: PaymentsService) { }

    @Post('initiate')
    initiate(@Body() body: PaymentsInitiateDto) {
        return this.paymentsService.initiate(body.token, body.couponCode, body.payerEmail);
    }

    @Post('callback')
    async callback(@Req() req: Request, @Res() res: Response) {
        const result = await this.paymentsService.handleCallback(req.body);
        res.redirect(result.redirectUrl);
    }
}
