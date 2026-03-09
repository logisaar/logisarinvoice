import { Controller, Get, Post, Patch, Delete, Param, Body, ParseIntPipe, UseGuards, Query } from '@nestjs/common';
import { CouponsService, CreateCouponDto } from './coupons.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('coupons')
export class CouponsController {
    constructor(private couponsService: CouponsService) { }

    // Public — validate coupon
    @Post('validate')
    validate(@Body() body: { code: string; amount: number }) {
        return this.couponsService.validate(body.code, body.amount);
    }

    // Admin — CRUD
    @UseGuards(JwtAuthGuard) @Get()
    findAll(@CurrentUser('id') uid: number) { return this.couponsService.findAll(uid); }

    @UseGuards(JwtAuthGuard) @Post()
    create(@CurrentUser('id') uid: number, @Body() dto: CreateCouponDto) { return this.couponsService.create(uid, dto); }

    @UseGuards(JwtAuthGuard) @Patch(':id')
    update(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') uid: number, @Body() dto: CreateCouponDto) { return this.couponsService.update(id, uid, dto); }

    @UseGuards(JwtAuthGuard) @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') uid: number) { return this.couponsService.remove(id, uid); }
}
