import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
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
import { UserModule } from './users/user.module';
import { PinModule } from './pin/pin.module';
@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
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
    UserModule,
    ClustersModule,
    TransactionModule,
    PinModule,
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
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
