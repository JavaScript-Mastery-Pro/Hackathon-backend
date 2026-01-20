import { Module } from '@nestjs/common';
import { QueueProcessor } from './queue.processor';
import { BullModule } from '@nestjs/bullmq';
import { MailModule } from '@/lib/mail/mail.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'submission',
    }),
    MailModule,
  ],
  providers: [QueueProcessor],
  exports: [BullModule],
})
export class QueueModule {}
