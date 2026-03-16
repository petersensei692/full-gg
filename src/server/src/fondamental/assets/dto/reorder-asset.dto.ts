import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class ReorderAssetDto {
  @ApiProperty({
    description: 'Move direction',
    enum: ['up', 'down'],
    example: 'up',
  })
  @IsIn(['up', 'down'])
  direction: 'up' | 'down';
}
