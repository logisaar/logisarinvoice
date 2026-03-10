import { Controller, Get, Post, Put, Patch, Delete, Param, Body, ParseIntPipe, UseGuards } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateInvoiceDto, UpdateInvoiceDto, UpdatePaymentDto, AcceptQuotationDto, FeedbackDto } from './dto/invoice.dto';
import { AuthService } from '../auth/auth.service';

@Controller('invoices')
export class InvoicesController {
    constructor(
        private invoicesService: InvoicesService,
        private authService: AuthService,
    ) { }

    // ── Admin routes (JWT protected) ───────────────────────────────────────────

    @UseGuards(JwtAuthGuard)
    @Get()
    findAll(@CurrentUser('id') uid: number) {
        return this.invoicesService.findAll(uid);
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') uid: number) {
        return this.invoicesService.findOne(id, uid);
    }

    @UseGuards(JwtAuthGuard)
    @Post()
    create(@CurrentUser('id') uid: number, @Body() dto: CreateInvoiceDto) {
        console.log("INCOMING DTO:", JSON.stringify(dto, null, 2));
        return this.invoicesService.create(uid, dto);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id/payment')
    updatePayment(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser('id') uid: number,
        @Body() dto: UpdatePaymentDto,
    ) {
        return this.invoicesService.updatePayment(id, uid, dto);
    }

    @UseGuards(JwtAuthGuard)
    @Put(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser('id') uid: number,
        @Body() dto: UpdateInvoiceDto,
    ) {
        return this.invoicesService.update(id, uid, dto);
    }
    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') uid: number) {
        return this.invoicesService.remove(id, uid);
    }

    // ── Public routes (no auth — client-facing) ────────────────────────────────

    @Get('public/:token')
    getPublic(@Param('token') token: string) {
        return this.invoicesService.findPublicByToken(token);
    }

    @Post('public/:token/accept')
    acceptQuotation(@Param('token') token: string, @Body() dto: AcceptQuotationDto) {
        return this.invoicesService.acceptQuotation(token, dto, this.authService);
    }

    @Post('public/:token/feedback')
    saveFeedback(@Param('token') token: string, @Body() dto: FeedbackDto) {
        return this.invoicesService.saveFeedback(
            token, dto.rating, dto.message, dto.couponCode, 0, 0
        );
    }
}
