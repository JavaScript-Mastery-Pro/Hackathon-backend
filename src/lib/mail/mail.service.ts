import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendHackathonJoinConfirmation(
    to: string,
    userName: string,
    hackathonName: string,
  ): Promise<void> {
    await this.mailerService.sendMail({
      to,
      subject: 'Welcome to the Hackathon!',
      template: 'hackathon-join-confirmation',
      context: {
        userName,
        hackathonName,
      },
    });
  }
}
