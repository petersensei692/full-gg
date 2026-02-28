import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Note } from './entities/note.entity';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note)
    private readonly noteRepository: Repository<Note>,
  ) {}

  async create(createNoteDto: CreateNoteDto): Promise<Note> {
    const payload = {
      ...createNoteDto,
      type: createNoteDto.type ?? 'other',
      images: createNoteDto.images ?? null,
      imageNames: createNoteDto.imageNames ?? null,
    };
    const note = this.noteRepository.create(payload);
    return this.noteRepository.save(note);
  }

  async findAll(type?: string): Promise<Note[]> {
    const where = type && ['macro', 'technical', 'other'].includes(type)
      ? { type }
      : {};
    const notes = await this.noteRepository.find({
      where,
      order: { updatedAt: 'DESC' },
    });
    // Sort: tier_1 first, tier_2 second, tier_3 last
    const tierOrder: Record<string, number> = { tier_1: 0, tier_2: 1, tier_3: 2 };
    return notes.sort((a, b) => {
      const orderA = tierOrder[a.tier ?? 'tier_2'] ?? 1;
      const orderB = tierOrder[b.tier ?? 'tier_2'] ?? 1;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }

  async findOne(id: string): Promise<Note> {
    const note = await this.noteRepository.findOne({ where: { id } });
    if (!note) {
      throw new NotFoundException(`Note with id ${id} not found`);
    }
    return note;
  }

  async update(id: string, updateNoteDto: UpdateNoteDto): Promise<Note> {
    const note = await this.findOne(id);
    Object.assign(note, updateNoteDto);
    return this.noteRepository.save(note);
  }

  async remove(id: string): Promise<void> {
    const note = await this.findOne(id);
    await this.noteRepository.remove(note);
  }
}
