import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { QqChannelService } from './qq-channel.service';
import { CreateQqChannelDto } from './dto/create-qq-channel.dto';
import { UpdateQqChannelDto } from './dto/update-qq-channel.dto';

@Controller('qq-channel')
export class QqChannelController {
  constructor(private readonly qqChannelService: QqChannelService) {}

  @Post()
  create(@Body() createQqChannelDto: CreateQqChannelDto) {
    return this.qqChannelService.create(createQqChannelDto);
  }

  @Get()
  findAll() {
    return this.qqChannelService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('channelId') channelId: string) {
    return this.qqChannelService.findOneOrCreate(id, channelId);
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateQqChannelDto: UpdateQqChannelDto) {
  //   return this.qqChannelService.update(+id, updateQqChannelDto);
  // }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.qqChannelService.remove(+id);
  }
}
