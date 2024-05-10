import { Transform } from "class-transformer";
import { BaseEntity } from "src/entities/base.entity";
import { Option } from "src/option/entities/option.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Work extends BaseEntity {
  @Column({
    length: 20,
    nullable: false,
    comment: '名称'
  })
  name: string;

  @Column({
    comment: '工作开始时间',
    type: 'time',
    nullable: true,
  })
  workStartTime: string;

  @JoinColumn()
  @ManyToOne(() => Option)
  option: Option;

  // @Transform(({ value }) => {
  //   if (value instanceof Date) {
  //     return value.toISOString().slice(0, 16).replace('T', ' ');
  //   } else {
  //     return value;
  //   }
  // })
  // get formattedWorkStartTime(): string {
  //   return this.workStartTime;
  // }
}
