import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DiscountType } from '@prisma/client';

export class CreateCouponDto {
    code: string;
    discountType: DiscountType;
    discountValue: number;
    minAmount?: number;
    maxUses?: number;
    validUntil?: string;
    isActive?: boolean;
}

@Injectable()
export class CouponsService {
    constructor(private prisma: PrismaService) { }

    findAll(userId: number) {
        return this.prisma.coupon.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    }

    create(userId: number, dto: CreateCouponDto) {
        return this.prisma.coupon.create({
            data: {
                userId,
                code: dto.code.toUpperCase(),
                discountType: dto.discountType,
                discountValue: dto.discountValue,
                minAmount: dto.minAmount ?? 0,
                maxUses: dto.maxUses ?? null,
                validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
                isActive: dto.isActive ?? true,
            },
        });
    }

    update(id: number, userId: number, dto: Partial<CreateCouponDto>) {
        return this.prisma.coupon.updateMany({ where: { id, userId }, data: dto });
    }

    remove(id: number, userId: number) {
        return this.prisma.coupon.deleteMany({ where: { id, userId } });
    }

    async validate(code: string, amount: number) {
        const coupon = await this.prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
        if (!coupon) throw new NotFoundException('Coupon not found');
        if (!coupon.isActive) throw new BadRequestException('Coupon is inactive');
        if (coupon.validUntil && coupon.validUntil < new Date()) throw new BadRequestException('Coupon has expired');
        if (coupon.maxUses && coupon.usesCount >= coupon.maxUses) throw new BadRequestException('Coupon usage limit reached');
        if (amount < Number(coupon.minAmount)) throw new BadRequestException(`Minimum order amount is ₹${coupon.minAmount}`);

        const discountAmount =
            coupon.discountType === 'percent'
                ? (amount * Number(coupon.discountValue)) / 100
                : Math.min(Number(coupon.discountValue), amount);
        const finalAmount = Math.max(1, amount - discountAmount);

        return { coupon_id: coupon.id, discount_amount: discountAmount, final_amount: finalAmount, discount_type: coupon.discountType, discount_value: coupon.discountValue };
    }

    async incrementUses(id: number) {
        return this.prisma.coupon.update({ where: { id }, data: { usesCount: { increment: 1 } } });
    }
}
