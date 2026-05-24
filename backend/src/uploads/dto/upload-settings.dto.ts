import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { EXPIRES_IN_VALUES, type ExpiresIn } from './create-upload.dto';

export class UpdateUploadDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string;

  @IsOptional()
  @IsIn(EXPIRES_IN_VALUES as unknown as string[])
  expiresIn?: ExpiresIn;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  downloadLimit?: number | null;

  @IsOptional()
  @IsString()
  @Length(4, 72)
  password?: string;

  @IsOptional()
  @IsBoolean()
  removePassword?: boolean;
}
