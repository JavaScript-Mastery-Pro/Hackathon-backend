import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from '../auth';
import { PrismaModule } from './lib/database/prisma.module';
import { UserModule } from './module/user/user.module';
import { HackathonModule } from './module/hackathon/hackathon.module';
import { ArcjetSecurityModule } from './lib/security/arcjet.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule.forRoot({ auth }),
    PrismaModule,
    UserModule,
    HackathonModule,
    ArcjetSecurityModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
