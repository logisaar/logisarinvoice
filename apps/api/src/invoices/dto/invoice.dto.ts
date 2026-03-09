import {
    IsString, IsOptional, IsNumber, IsEnum, IsDateString,
    IsArray, ValidateNested, Min
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PaymentType {
    full = 'full',
    partial = 'partial',
    onboarding = 'onboarding',
}

export class LineItemDto {
    @IsString() description: string;
    @IsNumber() @Min(0) quantity: number;
    @IsNumber() @Min(0) unitPrice: number;
    @IsNumber() taxPercent: number;
}

export class CreateInvoiceDto {
    @IsString() invoiceNumber: string;
    @IsNumber() @IsOptional() clientId?: number;
    @IsString() @IsOptional() clientName?: string;
    @IsString() @IsOptional() clientCompany?: string;
    @IsString() @IsOptional() clientEmail?: string;
    @IsString() @IsOptional() clientPhone?: string;
    @IsString() @IsOptional() clientAddress?: string;
    @IsString() @IsOptional() clientGST?: string;
    @IsDateString() invoiceDate: string;
    @IsDateString() dueDate: string;
    @IsArray() @ValidateNested({ each: true }) @Type(() => LineItemDto)
    items: LineItemDto[];
    @IsNumber() @IsOptional() discountAmount?: number;
    @IsEnum(PaymentType) @IsOptional() paymentType?: PaymentType;
    @IsNumber() @IsOptional() paymentAmount?: number;
    @IsString() @IsOptional() paymentLabel?: string;
    @IsString() @IsOptional() notes?: string;
    @IsString() @IsOptional() terms?: string;
}

export class UpdatePaymentDto {
    @IsNumber() @Min(1) paymentAmount: number;
    @IsString() paymentLabel: string;
}

export class AcceptQuotationDto {
    @IsString() @IsOptional() credential?: string;
    @IsString() @IsOptional() accessToken?: string;
    @IsString() @IsOptional() email?: string;
    @IsString() @IsOptional() name?: string;
    @IsString() @IsOptional() picture?: string;
}

export class FeedbackDto {
    @IsNumber() @Min(1) rating: number;
    @IsString() @IsOptional() message?: string;
    @IsString() @IsOptional() couponCode?: string;
}
