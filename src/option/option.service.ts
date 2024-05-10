import { Injectable } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { CreateOptionDto } from './dto/create-option.dto';
import { UpdateOptionDto } from './dto/update-option.dto';
import { Option } from 'src/option/entities/option.entity';
import { Repository, EntityManager } from 'typeorm';
import { Work } from 'src/work/entities/work.entity';

@Injectable()
export class OptionService {
  constructor(
    @InjectEntityManager() private entityManager: EntityManager,
    @InjectRepository(Option) private optionRepository: Repository<Option>
  ) {}

  create(createOptionDto: CreateOptionDto) {
    return 'This action adds a new option';
  }

  findAll() {
    return `This action returns all option`;
  }

  findOne(id: number) {
    return this.optionRepository.findOne({
      where: {
        id,
      },
      relations: {
        works: true,
      }
    });
  }

  async update(id: number, updateOptionDto: UpdateOptionDto) {
    const connection = this.entityManager.connection;
    await connection.transaction(async transactionalEntityManager => {
      const currOption = await this.optionRepository.findOne({
        where: { id },
        relations: {
          works: true,
        }
      });
      await transactionalEntityManager.delete(Work, currOption.works.map(w => w.id));
      currOption.works = updateOptionDto.works.map(w => {
        const newWork = new Work();
        newWork.name = w.name;
        newWork.workStartTime = w.workStartTime;
        return newWork;
      });
      Object.entries(updateOptionDto).forEach(([key, value]) => {
        if (['works'].includes(key)) {
          return;
        }
        currOption[key] = value;
      });
      await transactionalEntityManager.save(currOption);
    });

    return true;
  }

  remove(id: number) {
    return `This action removes a #${id} option`;
  }
}
