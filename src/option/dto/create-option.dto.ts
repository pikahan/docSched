import { Work } from "src/work/entities/work.entity";

export class CreateOptionDto {
  chatList: string;
  works: Omit<Partial<Work>, 'id' | 'option'>[];
  preReminderTime: number;
}
