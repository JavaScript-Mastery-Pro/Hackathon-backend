import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });
  app.enableCors({
    origin: [process.env.FRONTEND_URL],
    credentials: true,
  });
  app.useGlobalInterceptors(new TransformInterceptor(new Reflector()));
  await app.listen(process.env.PORT ?? 5000);
}
bootstrap();
