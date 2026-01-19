import { Injectable } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Injectable()
@Processor('submission')
export class QueueProcessor extends WorkerHost {
  async process(job: Job) {
    console.log('Processing job:', job.name, job.data);
    // simulate heavy work
    await new Promise((res) => setTimeout(res, 2000));
    console.log('Job completed:', job.id);
  }
}
