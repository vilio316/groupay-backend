import { IsNotEmpty, IsString } from 'class-validator';

export class CreateClusterDto {
  accountNumber?: string;
  @IsNotEmpty()
  memberIds: string[];

  @IsString()
  @IsNotEmpty()
  name: string;

  desc?: string;
}

export class CreatePlanDto {
  @IsNotEmpty()
  memberIds: string[];

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  desc: string;
}

export class EditPlanDto {
  name?: string;
  desc?: string;
  minimumContribution?: string;
}

export class UpdateClusterAccountDto {
  accountNumber: string;
}

export class MemberBody {
  @IsNotEmpty()
  @IsString()
  userId: string;
}
