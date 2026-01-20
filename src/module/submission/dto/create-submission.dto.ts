import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateSubmissionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;
}
