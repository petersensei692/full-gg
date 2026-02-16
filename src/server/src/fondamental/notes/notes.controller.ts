import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@ApiTags('fondamental')
@Controller('fondamental/notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new note' })
  @ApiBody({ type: CreateNoteDto })
  @ApiResponse({ status: 201, description: 'Note created.' })
  @ApiResponse({ status: 400, description: 'Invalid request body.' })
  create(@Body() createDto: CreateNoteDto) {
    return this.notesService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all notes' })
  @ApiResponse({ status: 200, description: 'List of notes (ordered by updatedAt desc).' })
  findAll() {
    return this.notesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one note by ID' })
  @ApiParam({ name: 'id', description: 'UUID of the note' })
  @ApiResponse({ status: 200, description: 'Note found.' })
  @ApiResponse({ status: 404, description: 'Note not found.' })
  findOne(@Param('id') id: string) {
    return this.notesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a note (partial)' })
  @ApiParam({ name: 'id', description: 'UUID of the note' })
  @ApiBody({ type: UpdateNoteDto })
  @ApiResponse({ status: 200, description: 'Note updated.' })
  @ApiResponse({ status: 404, description: 'Note not found.' })
  @ApiResponse({ status: 400, description: 'Invalid request body.' })
  update(@Param('id') id: string, @Body() updateDto: UpdateNoteDto) {
    return this.notesService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a note' })
  @ApiParam({ name: 'id', description: 'UUID of the note' })
  @ApiResponse({ status: 200, description: 'Note deleted.' })
  @ApiResponse({ status: 404, description: 'Note not found.' })
  remove(@Param('id') id: string) {
    return this.notesService.remove(id);
  }
}
