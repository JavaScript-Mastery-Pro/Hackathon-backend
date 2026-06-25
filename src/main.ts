import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { BadRequestException, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  // Better Auth handles body parsing for its own routes; the nestjs-better-auth
  // module parses bodies for everything else. Disable Nest's built-in parser so
  // the two don't conflict (required by @thallesp/nestjs-better-auth).
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.enableCors({
    origin: [process.env.FRONTEND_URL],
    credentials: true,
  });

  app.useGlobalInterceptors(new TransformInterceptor(new Reflector()));
  app.useGlobalPipes(
    new ValidationPipe({
      exceptionFactory: (errors) => {
        const result = errors.map((error) => ({
          property: error.property,
          message: error.constraints
            ? Object.values(error.constraints)[0]
            : 'Invalid value',
        }));
        return new BadRequestException(result);
      },
    }),
  );
  await app.listen(process.env.PORT ?? 5000);
}
bootstrap();
