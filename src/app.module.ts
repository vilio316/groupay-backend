import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from '../lib/auth';
import { PrismaModule } from './prisma/prisma.module';
import { ClustersModule } from './clusters/clusters.module';

@Module({
  imports: [
    AuthModule.forRoot({
      auth,
      bodyParser: {
        json: { limit: '2mb' },
        urlencoded: { limit: '2mb', extended: true },
        rawBody: true,
      },
    }),
    PrismaModule,
    ClustersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
