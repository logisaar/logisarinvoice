import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(6)
    password: string;
}

export class GoogleAuthDto {
    @IsString()
    credential: string; // Google JWT from GSI one-tap
}
