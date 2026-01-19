import { Controller, Post } from '@nestjs/common';
import { SubmissionService } from './submission.service';

@Controller('submission')
export class SubmissionController {
  constructor(private readonly submissionService: SubmissionService) {}

  @Post('test')
  // @AllowAnonymous()
  test() {
    return this.submissionService.test();
  }
}
