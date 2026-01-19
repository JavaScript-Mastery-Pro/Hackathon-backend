import { Module } from '@nestjs/common';
import { QueueProcessor } from './queue.processor';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'submission',
    }),
  ],
  providers: [QueueProcessor],
  exports: [BullModule],
})
export class QueueModule {}
