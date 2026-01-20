import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@/lib/database/prisma.service';
import { SubmissionStatus } from '@/prisma/enums';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import * as path from 'path';
import { promises as fs } from 'fs';

@Injectable()
export class SubmissionService {
  constructor(
    @InjectQueue('submission') private readonly submissionQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  async submission(
    hackathonId: string,
    userId: string,
    file: Express.Multer.File,
    createSubmissionDto: CreateSubmissionDto,
  ) {
    const participant = await this.prisma.hackathonParticipant.findUnique({
      where: {
        hackathonId_userId: { hackathonId, userId },
      },
      include: {
        hackathon: true,
        user: true, // We need this for the email later
      },
    });

    // 2. Logic Checks
    if (!participant) {
      throw new BadRequestException(
        'You must join the hackathon before submitting',
      );
    }

    if (!participant.hackathon.isActive) {
      throw new BadRequestException(
        'This hackathon is not accepting submissions',
      );
    }

    const submission = await this.prisma.submission.create({
      data: {
        title: createSubmissionDto.title,
        description: createSubmissionDto.description,
        hackathonId,
        userId,
        filePath: '', // Will be updated by the worker later if needed
        status: SubmissionStatus.PROCESSING,
      },
    });

    const tempDir = path.join(process.cwd(), 'uploads', 'temp');
    const tempFilePath = path.join(tempDir, `${submission.id}.tmp`);

    try {
      // Ensure directory exists (recursive: true handles if it already exists)
      await fs.mkdir(tempDir, { recursive: true });

      // Write file asynchronously so we don't block the server
      await fs.writeFile(tempFilePath, file.buffer);

      // 5. Add to Queue
      await this.submissionQueue.add(
        'process-submission',
        {
          submissionId: submission.id,
          tempFilePath,
          originalFilename: file.originalname,
          userEmail: participant.user.email, // Accessed from the single query above
          hackathonId,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: 10,
          removeOnFail: 5,
        },
      );
    } catch (error: unknown) {
      // 6. Cleanup on Failure (Best Practice)
      // If writing the file or adding to queue fails, we should delete the DB record
      // so the user can try again without seeing a stuck "Processing" submission.
      await this.prisma.submission.delete({ where: { id: submission.id } });

      // Attempt to clean up the file if it was partially written
      await fs.unlink(tempFilePath).catch(() => {});

      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'Failed to process submission',
      );
    }
    return true;
  }
}
