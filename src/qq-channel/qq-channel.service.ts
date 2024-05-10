import { Injectable } from '@nestjs/common';
import { CreateQqChannelDto } from './dto/create-qq-channel.dto';
import { UpdateQqChannelDto } from './dto/update-qq-channel.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { QqChannel } from './entities/qq-channel.entity';
import { Repository } from 'typeorm';
import { initOptions } from 'src/option/entities/option.entity';

@Injectable()
export class QqChannelService {
  constructor(
    @InjectRepository(QqChannel) private qqChannel: Repository<QqChannel>,
  ) {}
  create(createQqChannelDto: CreateQqChannelDto) {
    return 'This action adds a new qqChannel';
  }

  findAll() {
    return `This action returns all qqChannel`;
  }

  async findOneOrCreate(userId: string, channelId: string) {
    const res = await this.qqChannel.findOne({
      where: {
        userId,
        channelId,
      }
    });
    if (res) {
      return res;
    }
    const newOption = initOptions();
    const newQQChannel = new QqChannel();
    newQQChannel.option = newOption;
    newQQChannel.userId = userId;
    newQQChannel.channelId = channelId;
    return this.qqChannel.save(newQQChannel);
  }


  async update(userId: string, updateQqChannelDto: UpdateQqChannelDto) {
    const qqChannel = await this.qqChannel.findOne({
      where: {
        userId,
      }
    });
    qqChannel.qqBotToken = updateQqChannelDto.qqBotToken;
    qqChannel.channelId = updateQqChannelDto.channelId;
    await this.qqChannel.save(qqChannel);
    return true;
  }

  remove(id: number) {
    return `This action removes a #${id} qqChannel`;
  }
}
