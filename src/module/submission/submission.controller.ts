import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  Patch,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { SubmissionService } from './submission.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import type { Request as ExpressRequest } from 'express';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { SubmissionFileValidator } from '@/common/validators/file-type.validator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { SubmissionStatus } from '@/prisma/enums';

@Controller('submission')
@UseGuards(JwtAuthGuard)
export class SubmissionController {
  constructor(private readonly submissionService: SubmissionService) {}

  @Post(':hackathonId/submit')
  @UseInterceptors(FileInterceptor('file'))
  @ResponseMessage('Submission received and is being processed.')
  submission(
    @Param('hackathonId') hackathonId: string,
    @Body() createSubmissionDto: CreateSubmissionDto,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addValidator(new SubmissionFileValidator())
        .addMaxSizeValidator({ maxSize: 10 * 1024 * 1024 })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: Express.Multer.File,
    @Request() req: ExpressRequest,
  ) {
    return this.submissionService.submission(
      hackathonId,
      req.user!.id,
      file,
      createSubmissionDto,
    );
  }

  @Get('all')
  findAllSubmissions(@Request() req: ExpressRequest) {
    return this.submissionService.findAllSubmissions(
      req.user!.id,
      req.user!.role,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: ExpressRequest) {
    return this.submissionService.findOneSubmission(
      id,
      req.user!.id,
      req.user!.role,
    );
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ResponseMessage('Submission status updated')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: SubmissionStatus,
  ) {
    return this.submissionService.updateStatus(id, status);
  }
}
