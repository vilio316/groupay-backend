import { Injectable } from '@nestjs/common';
import { OptionalAuth } from '@thallesp/nestjs-better-auth';

@Injectable()
@OptionalAuth()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}
