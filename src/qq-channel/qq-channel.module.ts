import { Module } from '@nestjs/common';
import { QqChannelService } from './qq-channel.service';
import { QqChannelController } from './qq-channel.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QqChannel } from './entities/qq-channel.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([QqChannel])
  ],
  controllers: [QqChannelController],
  providers: [QqChannelService],
  exports: [QqChannelService],
})
export class QqChannelModule {}
