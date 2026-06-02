import { Module, DynamicModule, Global } from '@nestjs/common';
import { SquadService } from './squad.service';
import { SquadController } from './squad.controller';
import { SquadModuleOptions, SQUAD_MODULE_OPTIONS } from './squad.config';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * SquadModule
 *
 * Register once in your root AppModule:
 *
 * ```ts
 * SquadModule.register({
 *   secretKey: process.env.SQUAD_SECRET_KEY,
 *   isProduction: process.env.NODE_ENV === 'production',
 * })
 * ```
 *
 * Or use registerAsync to pull from a ConfigService:
 *
 * ```ts
 * SquadModule.registerAsync({
 *   imports: [ConfigModule],
 *   useFactory: (config: ConfigService) => ({
 *     secretKey: config.get('SQUAD_SECRET_KEY'),
 *     isProduction: config.get('NODE_ENV') === 'production',
 *   }),
 *   inject: [ConfigService],
 * })
 * ```
 */
@Global()
@Module({})
export class SquadModule {
  static register(options: SquadModuleOptions): DynamicModule {
    return {
      module: SquadModule,
      imports: [PrismaModule],
      controllers: [SquadController],
      providers: [
        { provide: SQUAD_MODULE_OPTIONS, useValue: options },
        SquadService,
      ],
      exports: [SquadService],
    };
  }

  static registerAsync(asyncOptions: {
    imports?: any[];
    useFactory: (
      ...args: any[]
    ) => SquadModuleOptions | Promise<SquadModuleOptions>;
    inject?: any[];
  }): DynamicModule {
    return {
      module: SquadModule,
      imports: [...(asyncOptions.imports ?? []), PrismaModule],
      controllers: [SquadController],
      providers: [
        {
          provide: SQUAD_MODULE_OPTIONS,
          useFactory: asyncOptions.useFactory,
          inject: asyncOptions.inject ?? [],
        },
        SquadService,
      ],
      exports: [SquadService],
    };
  }
}
