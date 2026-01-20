import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
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

    const newSubmission = await this.prisma.submission.create({
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
    const tempFilePath = path.join(tempDir, `${newSubmission.id}.tmp`);

    try {
      // Ensure directory exists (recursive: true handles if it already exists)
      await fs.mkdir(tempDir, { recursive: true });

      // Write file asynchronously so we don't block the server
      await fs.writeFile(tempFilePath, file.buffer);

      // 5. Add to Queue
      await this.submissionQueue.add(
        'process-submission',
        {
          submissionId: newSubmission.id,
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
      await this.prisma.submission.delete({ where: { id: newSubmission.id } });

      // Attempt to clean up the file if it was partially written
      await fs.unlink(tempFilePath).catch(() => {});

      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'Failed to process submission',
      );
    }
    return newSubmission;
  }

  async findAllSubmissions(userId: string, userRole: string) {
    const where = userRole === 'ADMIN' ? {} : { userId };

    return this.prisma.submission.findMany({
      where,
      include: {
        hackathon: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOneSubmission(id: string, userId: string, userRole: string) {
    // Build the filter dynamically
    // If ADMIN: Search by ID only.
    // If USER: Search by ID AND ensure it belongs to them.
    const where = userRole === 'ADMIN' ? { id } : { id, userId };

    const submission = await this.prisma.submission.findFirst({
      where,
      include: {
        hackathon: true,
        user: true,
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    return submission;
  }
}
