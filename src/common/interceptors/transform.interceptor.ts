import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { Response } from 'express';

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const reflectorContext = context.getHandler();
    const response = context.switchToHttp().getResponse<Response>();
    const statusCode = response.statusCode ?? 200;

    const message =
      this.reflector.get<string>('response-message', reflectorContext) ||
      'Success';

    return next.handle().pipe(
      map((data: T) => {
        return {
          statusCode,
          message,
          data,
        };
      }),
    );
  }
}
