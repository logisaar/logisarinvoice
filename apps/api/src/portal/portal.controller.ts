import { Controller, Post, Get, Body, Param, UseGuards, Res, Req, UnauthorizedException } from '@nestjs/common';
import { PortalService } from './portal.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('portal')
export class PortalController {
    constructor(private portalService: PortalService) { }

    // Public — client Google login
    @Post('auth/google')
    async clientGoogleLogin(
        @Body('email') email: string,
        @Body('name') name: string,
        @Body('picture') picture: string,
        @Res({ passthrough: true }) res: any,
    ) {
        if (!email) throw new UnauthorizedException('No email provided');
        const result = await this.portalService.clientGoogleLogin({ email, name, picture });
        // Clear any stale cookies first so old expired tokens don't override the new one
        res.clearCookie('access_token', { path: '/' });
        res.clearCookie('refresh_token', { path: '/' });
        this.setCookies(res, result.access_token, result.refresh_token);
        return { user: result.user };
    }

    // Public — refresh token via cookie
    @Post('auth/refresh')
    async refreshToken(@Req() req: any, @Res({ passthrough: true }) res: any) {
        const refreshToken = req?.cookies?.['refresh_token'];
        if (!refreshToken) throw new UnauthorizedException('No refresh token cookie');

        const result = await this.portalService.refreshClientToken(refreshToken);

        res.cookie('access_token', result.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 15 * 60 * 1000, // 15 minutes
        });

        return { success: true };
    }

    // Protected — logout
    @UseGuards(JwtAuthGuard)
    @Post('auth/logout')
    async clientLogout(@CurrentUser('sid') sid: string, @CurrentUser('email') email: string, @Res({ passthrough: true }) res: any) {
        await this.portalService.clientLogout(sid, email);
        res.clearCookie('access_token');
        res.clearCookie('refresh_token');
        return { success: true };
    }

    private setCookies(res: any, accessToken: string, refreshToken: string) {
        res.cookie('access_token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 2 * 60 * 60 * 1000, // 2h
        });
        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30d
        });
    }

    // Protected (client JWT) — list client's invoices
    @UseGuards(JwtAuthGuard)
    @Get('invoices')
    getInvoices(@CurrentUser('email') email: string) {
        return this.portalService.getClientInvoices(email);
    }

    // Protected (client JWT) — single invoice detail
    @UseGuards(JwtAuthGuard)
    @Get('invoices/:token')
    getInvoiceDetail(
        @Param('token') token: string,
        @CurrentUser('email') email: string,
    ) {
        return this.portalService.getClientInvoiceDetail(token, email);
    }
}
