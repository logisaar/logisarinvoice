import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [
        PrismaModule,
        MulterModule.register({
            storage: diskStorage({
                destination: (_req, _file, cb) => {
                    const dir = path.resolve(process.cwd(), 'uploads', 'logos');
                    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                    cb(null, dir);
                },
                filename: (req: any, file, cb) => {
                    const ext = path.extname(file.originalname).toLowerCase() || '.png';
                    cb(null, `${req.user.id}-${Date.now()}${ext}`);
                },
            }),
            fileFilter: (_req, file, cb) => {
                const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
                if (allowed.includes(file.mimetype)) {
                    cb(null, true);
                } else {
                    cb(new Error('Only image files are allowed (jpg, png, webp, svg)'), false);
                }
            },
            limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
        }),
    ],
    controllers: [SettingsController],
    providers: [SettingsService],
    exports: [SettingsService],
})
export class SettingsModule { }
