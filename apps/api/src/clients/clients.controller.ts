import { Controller, Get, Post, Patch, Delete, Param, Body, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/client.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('clients')
export class ClientsController {
    constructor(private clientsService: ClientsService) { }

    @Get() findAll(@CurrentUser('id') uid: number) { return this.clientsService.findAll(uid); }

    // -- Google Auth Users Endpoints --
    @Get('users/google')
    findAllGoogleUsers(@CurrentUser('id') uid: number) {
        return this.clientsService.findAllGoogleUsers(uid);
    }

    @Get('users/google/:email')
    findGoogleUserByEmail(@Param('email') email: string, @CurrentUser('id') uid: number) {
        return this.clientsService.findGoogleUserByEmail(email, uid);
    }

    @Post('users/google/:email/ban')
    banGoogleUser(@Param('email') email: string, @CurrentUser('id') uid: number) {
        return this.clientsService.banGoogleUser(email, uid);
    }

    @Post('users/google/:email/unban')
    unbanGoogleUser(@Param('email') email: string, @CurrentUser('id') uid: number) {
        return this.clientsService.unbanGoogleUser(email, uid);
    }
    // ---------------------------------

    @Get(':id') findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') uid: number) { return this.clientsService.findOne(id, uid); }
    @Post() create(@CurrentUser('id') uid: number, @Body() dto: CreateClientDto) { return this.clientsService.create(uid, dto); }
    @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') uid: number, @Body() dto: CreateClientDto) { return this.clientsService.update(id, uid, dto); }
    @Delete(':id') remove(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') uid: number) { return this.clientsService.remove(id, uid); }
}
