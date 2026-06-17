import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from '../lib/auth';
import { PrismaModule } from './prisma/prisma.module';
import { ClustersModule } from './clusters/clusters.module';
import { SquadModule } from './squad/squad.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationsModule } from './notifications/notifications.module';
import { TransactionModule } from './transactions/transactions.module';
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
    NotificationsModule,
    ClustersModule,
    TransactionModule,
    SquadModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secretKey: config.getOrThrow<string>('SQUAD_SECRET_KEY'),
        isProduction: config.get('NODE_ENV') === 'production',
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
