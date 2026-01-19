import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class SubmissionService {
  constructor(
    @InjectQueue('submission') private readonly submissionQueue: Queue,
  ) {}

  async test() {
    await this.submissionQueue.add('test-job', {
      hello: 'world',
    });

    return { message: 'Job added to queue' };
  }
}
