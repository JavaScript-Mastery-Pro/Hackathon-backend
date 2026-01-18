import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './module/user/user.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './../auth';
import { PrismaModule } from './lib/database/prisma.module';
import { HackathonModule } from './module/hackathon/hackathon.module';
import { MailService } from './lib/mail/mail.service';
import { MailModule } from './lib/mail/mail.module';

@Module({
  imports: [
    AuthModule.forRoot({ auth, disableGlobalAuthGuard: true }),
    PrismaModule,
    UserModule,
    ConfigModule.forRoot({ isGlobal: true }),
    HackathonModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [AppService, MailService],
})
export class AppModule {}
