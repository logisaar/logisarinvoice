import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CouponsService } from '../coupons/coupons.service';
import { InvoicesService } from '../invoices/invoices.service';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PaytmChecksum = require('paytmchecksum');

@Injectable()
export class PaymentsService {
    constructor(
        private prisma: PrismaService,
        private couponsService: CouponsService,
        private invoicesService: InvoicesService,
    ) { }

    async initiate(token: string, couponCode?: string, payerEmail?: string) {
        const invoice = await this.invoicesService.findPublicByToken(token);
        if (invoice.status === 'paid') throw new BadRequestException('Invoice already paid');

        let chargeAmount = Number(invoice.paymentAmount);

        // Apply coupon
        if (couponCode) {
            try {
                const result = await this.couponsService.validate(couponCode, chargeAmount);
                chargeAmount = result.final_amount;
            } catch { /* invalid coupon — proceed without discount */ }
        }

        const orderId = `ORDER_${invoice.id}_${Date.now()}`;
        const mid = process.env.PAYTM_MID!;
        const key = process.env.PAYTM_MERCHANT_KEY!;

        // Use new Paytm domain (guide: securestage.paytmpayments.com for staging)
        const host = process.env.PAYTM_HOST || 'securestage.paytmpayments.com';
        const callbackUrl = `${process.env.BACKEND_URL}/api/payments/callback`;

        // Build request body per new Paytm JS Checkout API
        const paytmBody: Record<string, unknown> = {
            requestType: 'Payment',
            mid,
            websiteName: process.env.PAYTM_WEBSITE || 'WEBSTAGING',
            orderId,
            callbackUrl,
            txnAmount: {
                value: chargeAmount.toFixed(2),
                currency: 'INR',
            },
            userInfo: {
                custId: payerEmail || invoice.clientGoogleEmail || `cust_${invoice.id}`,
                mobile: (invoice as any).clientPhone?.replace(/\D/g, '') || '9999999999',
                email: payerEmail || invoice.clientGoogleEmail || (invoice as any).clientEmail || '',
                firstName: (invoice as any).clientName || '',
                lastName: '',
            },
        };

        // Generate checksum on the JSON body string
        const checksum = await PaytmChecksum.generateSignature(
            JSON.stringify(paytmBody),
            key,
        );

        const paytmParams = {
            body: paytmBody,
            head: { signature: checksum },
        };

        // Call Paytm initiateTransaction API
        const initiateUrl =
            `https://${host}/theia/api/v1/initiateTransaction?mid=${mid}&orderId=${orderId}`;

        console.log('--- PAYTM INITIATE REQUEST ---');
        console.log('URL:', initiateUrl);
        console.log('Payload:', JSON.stringify(paytmParams, null, 2));

        let result: any;
        try {
            const resp = await fetch(initiateUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(paytmParams),
            });
            result = await resp.json();
            console.log('--- PAYTM RAW RESPONSE ---');
            console.log(JSON.stringify(result, null, 2));
        } catch (e: any) {
            console.error('Paytm fetch error:', e);
            throw new BadRequestException(`Paytm API unreachable: ${e.message}`);
        }

        if (!result?.body?.txnToken) {
            const msg = result?.body?.resultInfo?.resultMsg || 'Paytm initiation failed';
            const code = result?.body?.resultInfo?.resultCode || '';
            console.error(`Paytm Error: ${msg} (${code})`, result.body);
            throw new BadRequestException(`${msg} (${code})`);
        }

        // Save pending transaction
        await this.prisma.transaction.create({
            data: { invoiceId: invoice.id, orderId, amount: chargeAmount, status: 'initiated', payerEmail },
        });

        return {
            txnToken: result.body.txnToken,
            orderId,
            amount: chargeAmount.toFixed(2),
            mid,
            host,
        };
    }

    async handleCallback(body: Record<string, string>) {
        const { ORDERID, TXNID, STATUS, CHECKSUMHASH, TXNAMOUNT } = body;
        const key = process.env.PAYTM_MERCHANT_KEY!;

        // Verify checksum
        const paramsToVerify = { ...body };
        delete paramsToVerify.CHECKSUMHASH;

        let isValid = false;
        try {
            isValid = PaytmChecksum.verifySignature(paramsToVerify, key, CHECKSUMHASH);
        } catch { /* treat as invalid */ }

        if (!isValid) throw new BadRequestException('Invalid checksum');

        const transaction = await this.prisma.transaction.findUnique({
            where: { orderId: ORDERID },
            include: { invoice: true }
        });
        if (!transaction) throw new BadRequestException('Transaction not found');

        const success = STATUS === 'TXN_SUCCESS';

        if (success && transaction.payerEmail) {
            // Find the session for the payer to get their Google Name (if available)
            const session = await this.prisma.clientSession.findFirst({
                where: { invoiceId: transaction.invoiceId, googleEmail: transaction.payerEmail },
                orderBy: { signedInAt: 'desc' }
            });

            await this.prisma.invoice.update({
                where: { id: transaction.invoiceId },
                data: {
                    status: 'paid',
                    paidAt: new Date(),
                    clientGoogleEmail: transaction.payerEmail,
                    clientGoogleName: session?.googleName ?? transaction.invoice.clientGoogleName,
                },
            });
        } else if (success) {
            await this.prisma.invoice.update({
                where: { id: transaction.invoiceId },
                data: { status: 'paid', paidAt: new Date() },
            });
        }

        return {
            success,
            redirectUrl: `${process.env.FRONTEND_URL}/invoice/${transaction.invoice.paymentLinkToken}/success?txnId=${TXNID}&amount=${TXNAMOUNT || ''}`,
        };
    }
}
