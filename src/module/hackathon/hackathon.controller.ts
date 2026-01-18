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
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import type { Request as ExpressRequest } from 'express';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';

@Controller('hackathon')
@UseGuards(AuthGuard, RolesGuard)
export class HackathonController {
  constructor(private readonly hackathonService: HackathonService) {}

  @Post('create')
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

  @Patch('update/:id')
  @Roles('ADMIN')
  @ResponseMessage('Hackathon updated successfully')
  updateHackathon(
    @Param('id') id: string,
    @Body() updateHackathonDto: UpdateHackathonDto,
  ) {
    return this.hackathonService.updateHackathon(id, updateHackathonDto);
  }

  @Delete('remove/:id')
  @Roles('ADMIN')
  @ResponseMessage('Hackathon deleted successfully')
  removeHackathon(@Param('id') id: string) {
    return this.hackathonService.removeHackathon(id);
  }

  @Post(':id/join')
  @Roles('PARTICIPANT')
  @ResponseMessage('Joined hackathon successfully')
  async joinHackathon(@Param('id') id: string, @Request() req: ExpressRequest) {
    return this.hackathonService.joinHackathon(id, req.user!.id);
  }
}
