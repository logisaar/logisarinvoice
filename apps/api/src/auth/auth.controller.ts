import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, GoogleAuthDto } from './dto/auth.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('login')
    login(@Body() dto: LoginDto) {
        return this.authService.login(dto.email, dto.password);
    }

    @Post('google')
    verifyGoogle(@Body() dto: GoogleAuthDto) {
        return this.authService.verifyGoogleCredential(dto.credential);
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    getMe(@CurrentUser('id') userId: number) {
        return this.authService.getMe(userId);
    }
}
