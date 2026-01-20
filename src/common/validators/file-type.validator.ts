import { FileValidator } from '@nestjs/common';

export class SubmissionFileValidator extends FileValidator {
  // Define allowed extensions in one central place
  private readonly allowedExtensions = [
    'pdf',
    'zip',
    'js',
    'ts',
    'py',
    'c',
    'cpp',
    'java',
    'go',
    'rs',
    'php',
    'rb',
  ];

  constructor() {
    // We don't need to pass options anymore, so we pass an empty object to the parent
    super({});
  }

  buildErrorMessage(): string {
    return `Invalid file type. Allowed: ${this.allowedExtensions.join(', ')}`;
  }

  isValid(file: Express.Multer.File): boolean {
    if (!file || !file.originalname) return false;

    const extension = file.originalname.split('.').pop()?.toLowerCase();

    // Check if extension exists and is in the allowed list
    return !!extension && this.allowedExtensions.includes(extension);
  }
}
