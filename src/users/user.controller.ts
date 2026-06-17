import { Get, Controller, Param } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('userData')
export class UserController {
  constructor(private readonly user: UserService) {}

  @Get()
  fetchUsers() {
    return this.user.getUsers();
  }

  @Get(':email')
  fetchUser(@Param('email') email: string) {
    return this.user.fetchUser(email);
  }
}
