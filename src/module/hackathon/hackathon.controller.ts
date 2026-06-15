import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { HackathonService } from './hackathon.service';
import { CreateHackathonDto } from './dto/create-hackathon.dto';
import { UpdateHackathonDto } from './dto/update-hackathon.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import type { Request as ExpressRequest } from 'express';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';

@Controller('hackathon')
export class HackathonController {
  constructor(private readonly hackathonService: HackathonService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ResponseMessage('Hackathon created successfully')
  createHackathon(
    @Body() createHackathonDto: CreateHackathonDto,
    @Request() req: ExpressRequest,
  ) {
    return this.hackathonService.createHackathon(
      createHackathonDto,
      req.user!.id,
    );
  }

  @Get()
  findAll() {
    return this.hackathonService.findAllHackathons();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.hackathonService.findOneHackathon(id);
  }

  @Get(':id/participants')
  getParticipants(@Param('id') id: string) {
    return this.hackathonService.getParticipants(id);
  }

  @Patch('update/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ResponseMessage('Hackathon updated successfully')
  updateHackathon(
    @Param('id') id: string,
    @Body() updateHackathonDto: UpdateHackathonDto,
  ) {
    return this.hackathonService.updateHackathon(id, updateHackathonDto);
  }

  @Delete('remove/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ResponseMessage('Hackathon deleted successfully')
  removeHackathon(@Param('id') id: string) {
    return this.hackathonService.removeHackathon(id);
  }

  @Post(':id/join')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PARTICIPANT')
  @ResponseMessage('You have successfully joined the hackathon')
  joinHackathon(@Param('id') id: string, @Request() req: ExpressRequest) {
    return this.hackathonService.joinHackathon(id, req.user!.id);
  }
}
