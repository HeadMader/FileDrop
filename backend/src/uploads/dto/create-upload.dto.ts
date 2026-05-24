import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const EXPIRES_IN_VALUES = [
  '1h',
  '6h',
  '24h',
  '3d',
  '7d',
  '14d',
  '30d',
] as const;

export type ExpiresIn = (typeof EXPIRES_IN_VALUES)[number];

export const EXPIRES_IN_MS: Record<ExpiresIn, number> = {
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '3d': 3 * 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '14d': 14 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

export const ANON_ALLOWED_EXPIRES: ExpiresIn[] = [
  '1h',
  '6h',
  '24h',
  '3d',
  '7d',
];

export class CreateUploadDto {
  @IsIn(EXPIRES_IN_VALUES as unknown as string[])
  expiresIn!: ExpiresIn;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  downloadLimit?: number | null;

  @IsOptional()
  @IsString()
  password?: string;
}
