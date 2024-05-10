import { BaseEntity } from "src/entities/base.entity";
import { Option } from "src/option/entities/option.entity";
import { Column, Entity, OneToOne } from "typeorm";

@Entity()
export class User extends BaseEntity {
    @Column({
        length: 50
    })
    username: string;

    @Column({
        length: 50
    })
    password: string;

    @OneToOne(() => Option, o => o.user, {
        cascade: true,
    })
    option: Option;
}