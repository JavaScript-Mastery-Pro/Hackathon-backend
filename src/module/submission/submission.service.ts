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
      where: { hackathonId_userId: { hackathonId, userId } },
      include: { hackathon: true, user: true },
    });

    if (!participant) {
      throw new BadRequestException(
        'You must join the hackathon before submitting',
      );
    }

    if (!participant.hackathon.isActive || participant.hackathon.endsAt < new Date()) {
      throw new BadRequestException(
        'This hackathon is not accepting submissions',
      );
    }

    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    const isZip = ext === 'zip' || ext === 'pdf';
    const category = isZip ? 'projects' : getLanguageFromExt(ext);

    const newSubmission = await this.prisma.submission.create({
      data: {
        title: createSubmissionDto.title,
        description: createSubmissionDto.description,
        hackathonId,
        userId,
        filePath: '',
        status: SubmissionStatus.UNDER_REVIEW,
      },
    });

    const finalDir = path.join(process.cwd(), 'uploads', hackathonId, category);
    const finalPath = path.join(finalDir, `${newSubmission.id}.${ext}`);
    const dbFilePath = `${hackathonId}/${category}/${newSubmission.id}.${ext}`;

    try {
      await fs.mkdir(finalDir, { recursive: true });
      await fs.writeFile(finalPath, file.buffer);

      await this.prisma.submission.update({
        where: { id: newSubmission.id },
        data: { filePath: dbFilePath },
      });

      await this.submissionQueue.add(
        'send-submission-email',
        {
          userEmail: participant.user.email,
          submissionTitle: newSubmission.title,
          submissionId: newSubmission.id,
        },
        { attempts: 3, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 10, removeOnFail: 5 },
      );
    } catch (error: unknown) {
      await this.prisma.submission.delete({ where: { id: newSubmission.id } });
      await fs.unlink(finalPath).catch(() => {});
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
      include: { hackathon: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneSubmission(id: string, userId: string, userRole: string) {
    const where = userRole === 'ADMIN' ? { id } : { id, userId };
    const submission = await this.prisma.submission.findFirst({
      where,
      include: { hackathon: true, user: true },
    });
    if (!submission) {
      throw new NotFoundException('Submission not found');
    }
    return submission;
  }

  async updateStatus(id: string, status: SubmissionStatus) {
    const submission = await this.prisma.submission.findUnique({ where: { id } });
    if (!submission) {
      throw new NotFoundException('Submission not found');
    }
    return this.prisma.submission.update({
      where: { id },
      data: { status },
    });
  }
}

const getLanguageFromExt = (ext: string): string => {
  const map: Record<string, string> = {
    js: 'javascript', ts: 'typescript', py: 'python',
    cpp: 'cpp', c: 'c', java: 'java', php: 'php',
    rb: 'ruby', go: 'go', rs: 'rust',
  };
  return map[ext] || 'others';
};
