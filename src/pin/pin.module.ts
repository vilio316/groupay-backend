import { Module, Global } from '@nestjs/common';
import { PinController } from './pin.controller';
import { PinService } from './pin.service';
import { PrismaService } from '../prisma/prisma.service';

@Global()
@Module({
  imports: [],
  controllers: [PinController],
  providers: [PinService, PrismaService],
  exports: [PinService],
})
export class PinModule {}
