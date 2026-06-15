import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './lib/database/prisma.module';
import { AuthModule } from './module/auth/auth.module';
import { UserModule } from './module/user/user.module';
import { HackathonModule } from './module/hackathon/hackathon.module';
import { SubmissionModule } from './module/submission/submission.module';
import { MailModule } from './lib/mail/mail.module';
import { BullmqModule } from './lib/bullmq/bullmq.module';
import { QueueModule } from './lib/queue/queue.module';
import { ArcjetSecurityModule } from './lib/security/arcjet.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UserModule,
    HackathonModule,
    SubmissionModule,
    MailModule,
    BullmqModule,
    QueueModule,
    ArcjetSecurityModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
