import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import type { Request as ExpressRequest } from 'express';

@Controller('user')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  me(@Request() req: ExpressRequest) {
    return { user: req.user };
  }

  @Get()
  @Roles('ADMIN')
  @ResponseMessage('Fetch all users')
  findAll() {
    return this.userService.findAllUsers();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.userService.findUserById(id);
  }
}
