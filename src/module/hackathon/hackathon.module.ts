import { Module } from '@nestjs/common';
import { HackathonService } from './hackathon.service';
import { HackathonController } from './hackathon.controller';
import { MailModule } from '@/lib/mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [HackathonController],
  providers: [HackathonService],
})
export class HackathonModule {}
