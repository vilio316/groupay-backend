import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserService{
    constructor(private readonly prisma: PrismaService){}

    getUsers(){
        return this.prisma.user.findMany({
            orderBy: {
                createdAt: 'desc'
            }
        })
    }

    fetchUser(email: string){
        return this.prisma.user.findUnique({
            where: {
                email: email
            }
        })
    }
}

