import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateAssetDto {
  @ApiProperty({
    description: 'Unique name of the asset (e.g. USD, EUR, STOCKS)',
    example: 'USD',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}
