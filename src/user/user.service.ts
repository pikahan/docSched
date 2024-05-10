import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { User } from './entity/user.entity';
import { initOptions, Option } from '../option/entities/option.entity';
import * as crypto from 'crypto';
import { Work } from 'src/work/entities/work.entity';

function md5(str) {
    const hash = crypto.createHash('md5');
    hash.update(str);
    return hash.digest('hex');
}

@Injectable()
export class UserService {

    constructor(
        @InjectRepository(User) private userRepository: Repository<User>,
    ){}
    @InjectEntityManager()
    private entityManager: EntityManager;

    async register(user: CreateUserDto) {
        const foundUser = await this.userRepository.findOneBy({
            username: user.username
        });

        if(foundUser) {
            throw new HttpException('用户已存在', 200);
        }

        const newUser = new User();
        const newOption = initOptions();
        newUser.username = user.username;
        newUser.password = md5(user.password);
        newUser.option = newOption;
        try {
            await this.userRepository.save(newUser);
            return '注册成功';
        } catch(e) {
            // this.logger.error(e, UserService);
            return '注册失败';
        }
    }

    async login(loginUserDto: LoginUserDto) {
        const user = await this.entityManager.findOne(User, {
            where: {
                username: loginUserDto.username
            },
            relations: {
                option: true,
            }
        });

        if(!user) {
            throw new HttpException('用户不存在', HttpStatus.OK);
        }

        if(user.password !== md5(loginUserDto.password)) {
            throw new HttpException('密码错误', HttpStatus.OK);
        }

        return user;
    }

    async findUserById(userId: number) {
        return await this.entityManager.findOne(User, {
            where: {
                id: userId
            },
            relations: {
                option: true,
            }
        });
    }
}
