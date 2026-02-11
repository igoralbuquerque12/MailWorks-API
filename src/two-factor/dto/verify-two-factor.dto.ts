import { IsEmail, IsString, Length } from 'class-validator';
import { TWO_FACTOR_CODE_LENGTH } from '../constants/two-factor.constants';

export class VerifyTwoFactorDTO {
  @IsEmail()
  email: string;

  @IsString()
  @Length(TWO_FACTOR_CODE_LENGTH, TWO_FACTOR_CODE_LENGTH)
  code: string;
}
