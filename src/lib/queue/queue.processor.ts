import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { MailService } from '../mail/mail.service';

interface SubmissionEmailJobData {
  userEmail: string;
  submissionTitle: string;
  submissionId: string;
}

@Processor('submission')
export class QueueProcessor extends WorkerHost {
  private readonly logger = new Logger(QueueProcessor.name);

  constructor(private readonly mailService: MailService) {
    super();
  }

  async process(job: Job) {
    const { userEmail, submissionTitle, submissionId } =
      job.data as SubmissionEmailJobData;

    await this.mailService.sendSubmissionProcessed(
      userEmail,
      submissionTitle,
      submissionId,
    );

    this.logger.log(`Submission email sent for job ${job.id}`);
    return { success: true };
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(`Email job ${job.id} failed: ${err.message}`);
  }
}
