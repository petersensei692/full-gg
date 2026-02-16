import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateNoteDto {
  @ApiProperty({
    description: 'Note title',
    example: 'Fed rate decision',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;

  @ApiProperty({
    description: 'Note content (HTML supported)',
    example: '<p>First sentence. Second sentence.</p>',
  })
  @IsString()
  @IsNotEmpty()
  note: string;
}
