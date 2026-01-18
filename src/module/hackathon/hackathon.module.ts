import { Module } from '@nestjs/common';
import { HackathonService } from './hackathon.service';
import { HackathonController } from './hackathon.controller';

@Module({
  controllers: [HackathonController],
  providers: [HackathonService],
})
export class HackathonModule {}
