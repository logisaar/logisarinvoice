import {
    Controller, Get, Put, Post, Delete,
    Body, UseGuards, Request, UseInterceptors,
    UploadedFile, BadRequestException, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) { }

    @Get()
    async getSettings(@Request() req) {
        return this.settingsService.getSettings(req.user.id);
    }

    @Put()
    async updateSettings(@Request() req, @Body() body: any) {
        return this.settingsService.updateSettings(req.user.id, body);
    }

    /** Upload or replace company logo */
    @Post('logo')
    @UseInterceptors(FileInterceptor('logo'))
    async uploadLogo(@Request() req, @UploadedFile() file: Express.Multer.File) {
        if (!file) throw new BadRequestException('No file provided');

        // Remove previous logo from disk before saving new one
        await this.settingsService.removeOldLogoFile(req.user.id);

        // Build a URL path relative to the API root (works in dev and production)
        const logoUrl = `/uploads/logos/${file.filename}`;
        await this.settingsService.updateLogoUrl(req.user.id, logoUrl);

        return { logoUrl };
    }

    /** Delete company logo */
    @Delete('logo')
    @HttpCode(HttpStatus.OK)
    async deleteLogo(@Request() req) {
        await this.settingsService.deleteLogo(req.user.id);
        return { logoUrl: null };
    }
}
