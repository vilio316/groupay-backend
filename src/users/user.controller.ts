import { Get, Controller, Param, Query } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('userData')
export class UserController {
  constructor(private readonly user: UserService) {}

  @Get()
  fetchById(@Query('id') id: string) {
    return this.user.getUserById(id);
  }

  @Get(':email')
  fetchUser(@Param('email') email: string) {
    return this.user.fetchUser(email);
  }

  @Get('/query/:email')
  fetchQueryResults(@Param('email') email: string) {
    return this.user.getUsersByValue(email);
  }
}
