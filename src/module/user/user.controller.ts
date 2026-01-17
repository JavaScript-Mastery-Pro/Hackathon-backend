import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard, Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { UserService } from './user.service';
import { RolesGuard } from '@/lib/guards/roles.guard';
import { Roles } from '@/lib/decorators/roles.decorator';

@Controller('user')
@UseGuards(AuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  me(@Session() session: UserSession) {
    return { user: session.user };
  }

  @Get()
  @Roles('ADMIN')
  findAll() {
    return this.userService.findAllUsers();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.userService.findUserById(id);
  }
}
