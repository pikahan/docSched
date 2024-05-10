import { BaseEntity } from "src/entities/base.entity";
import { Option } from "src/option/entities/option.entity";
import { Column, Entity, OneToOne } from "typeorm";

@Entity()
export class QqChannel extends BaseEntity {
  @Column()
  userId: string;

  @Column()
  channelId: string;

  @Column({
    length: 64,
    nullable: true,
  })
  qqBotToken: string;

  @OneToOne(() => Option, o => o.qqChannel, {
    cascade: true,
  })
  option: Option;
}
