import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class PaymentsInitiateDto {
    @IsString()
    @IsNotEmpty()
    token: string;

    @IsString()
    @IsOptional()
    couponCode?: string;

    @IsString()
    @IsOptional()
    payerEmail?: string;
}
