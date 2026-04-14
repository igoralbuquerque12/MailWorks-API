import { IsString, IsEmail, IsNotEmpty } from 'class-validator';

export class CreateEmailJobDto {
    @IsString()
    @IsNotEmpty()
    tenantId!: string;

    @IsString()
    @IsNotEmpty()
    providerId!: string;

    @IsEmail()
    @IsNotEmpty()
    to!: string;

    @IsString()
    @IsNotEmpty()
    subject!: string;

    @IsString()
    @IsNotEmpty()
    content!: string;
}