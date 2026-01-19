import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateHackathonDto } from './dto/create-hackathon.dto';
import { UpdateHackathonDto } from './dto/update-hackathon.dto';
import { PrismaService } from '@/lib/database/prisma.service';
import { MailService } from '@/lib/mail/mail.service';

@Injectable()
export class HackathonService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async createHackathon(
    createHackathonDto: CreateHackathonDto,
    authorId: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: authorId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return await this.prisma.hackathon.create({
      data: {
        name: createHackathonDto.name,
        description: createHackathonDto.description,
        startsAt: new Date(createHackathonDto.startsAt),
        endsAt: new Date(createHackathonDto.endsAt),
        isActive: createHackathonDto.isActive,
        authorId,
      },
    });
  }

  async findAllHackathons() {
    return await this.prisma.hackathon.findMany();
  }

  async findOneHackathon(id: string) {
    const hackathon = await this.prisma.hackathon.findUnique({ where: { id } });
    if (!hackathon) {
      throw new NotFoundException('Hackathon not found');
    }
    return hackathon;
  }

  async updateHackathon(id: string, updateHackathonDto: UpdateHackathonDto) {
    const hackathon = await this.prisma.hackathon.findUnique({ where: { id } });
    if (!hackathon) {
      throw new NotFoundException('Hackathon not found');
    }

    return await this.prisma.hackathon.update({
      where: { id },
      data: { ...updateHackathonDto },
    });
  }

  async removeHackathon(id: string) {
    const hackathon = await this.prisma.hackathon.findUnique({ where: { id } });
    if (!hackathon) {
      throw new NotFoundException('Hackathon not found');
    }

    await this.prisma.hackathon.delete({ where: { id } });

    return null;
  }

  async joinHackathon(hackathonId: string, userId: string) {
    const hackathon = await this.prisma.hackathon.findUnique({
      where: { id: hackathonId },
    });
    if (!hackathon) {
      throw new NotFoundException('Hackathon not found');
    }
    if (!hackathon.isActive || hackathon.endsAt < new Date()) {
      throw new BadRequestException(
        'This hackathon is not accepting submissions at this time',
      );
    }
    // Check if already joined
    const alreadyJoined = await this.prisma.hackathonParticipant.findUnique({
      where: { hackathonId_userId: { hackathonId, userId } },
    });
    if (alreadyJoined) {
      throw new BadRequestException('Already joined this hackathon');
    }
    // Get user details
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    // Join
    const participant = await this.prisma.hackathonParticipant.create({
      data: { hackathonId, userId },
    });
    console.log('Confirmation email sent');
    await this.mailService.sendHackathonJoinConfirmation(
      user.email,
      user.name,
      hackathon.name,
    );

    return participant;
  }
}
