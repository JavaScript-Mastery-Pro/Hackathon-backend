import { SetMetadata } from '@nestjs/common';

export const ResponseMessage = (args: string) =>
  SetMetadata('response-message', args);
