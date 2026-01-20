import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendHackathonJoinConfirmation(
    to: string,
    userName: string,
    hackathonName: string,
  ) {
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

  async sendSubmissionProcessed(
    to: string,
    submissionTitle: string,
    submissionId: string,
  ) {
    await this.mailerService.sendMail({
      to,
      subject: 'Submission Processed Successfully',
      template: 'submission-processed',
      context: {
        title: submissionTitle,
        submissionId,
      },
    });
  }
}
