import { BaseEntity } from 'src/entities/base.entity';
import { User } from 'src/user/entity/user.entity';
import { Work } from 'src/work/entities/work.entity';
import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { QqChannel } from '../../qq-channel/entities/qq-channel.entity';
import * as crypto from 'crypto';

@Entity()
export class Option extends BaseEntity {
  @Column({
    length: 60,
    comment: '识别字符集',
    default: '0123456789()日期我的排班次周一二三四五六日后夜前责-治疗今备呼',
    nullable: false,
  })
  chatList: string;

  @Column({
    length: 64,
    nullable: false,
  })
  qqBotToken: string;

  @Column({
    comment: '提前提醒时间, 单位分钟',
    default: 50
  })
  preReminderTime: number;

  @JoinColumn()
  @OneToOne(() => User, {
    onDelete: 'CASCADE',
  })
  user: User;

  @JoinColumn()
  @OneToOne(() => QqChannel, {
    onDelete: 'CASCADE',
  })
  qqChannel: QqChannel;

  @OneToMany(() => Work, w => w.option, {
    cascade: true,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  works: Work[];
}


export const initOptions = () => {
  const newOption = new Option();
  const list = [
      {
          name: '责4',
          workStartTime: '01:20',
      },
      {
          name: '前夜',
          workStartTime: '16:00',
      },
      {
          name: '后夜',
          workStartTime: '00:00',
      },
      {
          name: '治疗',
          workStartTime: '20:00',
      },
      {
          name: '备呼',
      },
  ];
  newOption.qqBotToken = crypto.randomUUID();
  newOption.works = list.map(info => {
      const work = new Work();
      work.name = info.name;
      work.workStartTime = info.workStartTime;
      return work;
  });
  return newOption;
}