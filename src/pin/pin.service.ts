import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

@Injectable()
export class PinService {
  constructor(private readonly prisma: PrismaService) {}

  async setPin(userId: string, pin: string) {
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      throw new BadRequestException('PIN must be exactly 4 digits');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.pinSet) {
      throw new BadRequestException('PIN has already been set. Use change PIN instead.');
    }

    const { hash, salt } = this.hashPin(pin);

    await this.prisma.user.update({
      where: { id: userId },
      data: { pin: `${salt}:${hash}`, pinSet: true },
    });

    return { success: true, message: 'PIN set successfully' };
  }

  async changePin(userId: string, currentPin: string, newPin: string) {
    if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      throw new BadRequestException('New PIN must be exactly 4 digits');
    }

    await this.verifyPin(userId, currentPin);

    const { hash, salt } = this.hashPin(newPin);

    await this.prisma.user.update({
      where: { id: userId },
      data: { pin: `${salt}:${hash}` },
    });

    return { success: true, message: 'PIN changed successfully' };
  }

  async verifyPin(userId: string, pin: string) {
    if (!pin || !/^\d{4}$/.test(pin)) {
      throw new BadRequestException('PIN must be exactly 4 digits');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!user.pinSet || !user.pin) {
      throw new BadRequestException('No PIN has been set. Please set a PIN first.');
    }

    const [salt, storedHash] = user.pin.split(':');
    const hash = scryptSync(pin, salt, 64).toString('hex');

    if (storedHash.length !== hash.length || !timingSafeEqual(Buffer.from(storedHash), Buffer.from(hash))) {
      throw new ForbiddenException('Incorrect PIN');
    }

    return { success: true };
  }

  async checkPinStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pinSet: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return { hasPin: user.pinSet };
  }

  private hashPin(pin: string) {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(pin, salt, 64).toString('hex');
    return { salt, hash };
  }
}
