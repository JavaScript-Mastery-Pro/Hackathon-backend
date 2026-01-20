import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { Logger } from '@nestjs/common';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import { SubmissionStatus } from '@/prisma/client';
import { MailService } from '../mail/mail.service';

interface SubmissionJobData {
  submissionId: string;
  tempFilePath: string;
  originalFilename: string;
  userEmail: string;
  hackathonId: string;
}

// Keep helper pure and outside the class
const getLanguageFromExt = (ext: string): string => {
  const map: Record<string, string> = {
    js: 'javascript',
    ts: 'typescript',
    py: 'python',
    cpp: 'cpp',
    c: 'c',
    java: 'java',
    php: 'php',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
  };
  return map[ext] || 'others';
};

@Processor('submission')
export class QueueProcessor extends WorkerHost {
  private readonly logger = new Logger(QueueProcessor.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {
    super();
  }

  async process(job: Job) {
    const data = job.data as SubmissionJobData;
    const {
      submissionId,
      tempFilePath,
      originalFilename,
      userEmail,
      hackathonId,
    } = data;

    try {
      // 1. Validation: Ensure record exists
      const submission = await this.prisma.submission.findUnique({
        where: { id: submissionId },
      });

      // If submission was deleted by user while in queue, stop processing
      if (!submission) {
        this.logger.warn(`Submission ${submissionId} not found. Aborting.`);
        return; // Return silently to mark job as completed (no need to retry)
      }

      // 2. Determine Destination
      const ext = path.extname(originalFilename).toLowerCase().slice(1);
      const isZip = ext === 'zip' || ext === 'pdf';
      const category = isZip ? 'projects' : getLanguageFromExt(ext);

      const finalDir = path.join(
        process.cwd(),
        'uploads',
        hackathonId,
        category,
      );
      const finalFileName = `${submissionId}.${ext}`;
      const finalPath = path.join(finalDir, finalFileName);
      const dbFilePath = `${hackathonId}/${category}/${finalFileName}`; // Relative path for DB

      await fsPromises.mkdir(finalDir, { recursive: true });
      try {
        await fsPromises.rename(tempFilePath, finalPath);
      } catch (error: unknown) {
        if (
          error instanceof Error &&
          'code' in error &&
          error.code === 'EXDEV'
        ) {
          // Fallback for Docker/Cross-partition
          await fsPromises.copyFile(tempFilePath, finalPath);
          await fsPromises.unlink(tempFilePath);
        } else {
          throw error;
        }
      }

      // 4. Update Database
      await this.prisma.submission.update({
        where: { id: submissionId },
        data: {
          filePath: dbFilePath,
          status: SubmissionStatus.COMPLETED,
        },
      });

      // 5. Send Notification
      await this.mailService.sendSubmissionProcessed(
        userEmail,
        submission.title,
        submissionId,
      );

      this.logger.log(`Job ${job.id} completed successfully`);
      return { success: true, submissionId };
    } catch (error) {
      this.logger.error(`Error processing job ${job.id}`, error);
      throw error;
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job, err: Error) {
    this.logger.error(`Job ${job.id} failed completely: ${err.message}`);

    const data = job.data as SubmissionJobData;
    const { submissionId, tempFilePath } = data;

    // 1. Update DB to FAILED (Final State)
    if (submissionId) {
      await this.prisma.submission.update({
        where: { id: submissionId },
        data: { status: SubmissionStatus.FAILED },
      });
    }

    // 2. Cleanup Temp File
    if (tempFilePath) {
      try {
        await fsPromises.access(tempFilePath); // Check existence
        await fsPromises.unlink(tempFilePath);
        this.logger.log(`Cleaned up temp file: ${tempFilePath}`);
      } catch {
        // File might have been moved already or doesn't exist
      }
    }
  }
}
