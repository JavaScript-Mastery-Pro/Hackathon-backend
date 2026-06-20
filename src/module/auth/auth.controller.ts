import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { slidingWindow } from '@arcjet/nest';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { ArcjetRules } from '@/common/decorators/arcjet-rules.decorator';

// Strict per-IP limit on auth endpoints to curb brute-force and signup spam.
@ArcjetRules(slidingWindow({ mode: 'LIVE', interval: '1m', max: 10 }))
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sign-up')
  @ResponseMessage('Signed up successfully')
  signUp(@Body() dto: SignUpDto) {
    return this.authService.signUp(dto);
  }

  @Post('sign-in')
  @HttpCode(200)
  @ResponseMessage('Signed in successfully')
  signIn(@Body() dto: SignInDto) {
    return this.authService.signIn(dto);
  }
}
