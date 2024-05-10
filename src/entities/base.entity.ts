import {
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/*
 * Entity 基类
 * */
export class BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn({
    name: 'created_time',
    type: 'datetime',
    comment: '创建时间',
  })
  createdTime?: string;

  @UpdateDateColumn({
    name: 'updated_time',
    type: 'datetime',
    comment: '更新时间',
  })
  updatedTime?: string;

  @DeleteDateColumn({
    name: 'deleted_time',
    type: 'datetime',
    comment: '删除时间',
  })
  deletedTime?: string;
}
