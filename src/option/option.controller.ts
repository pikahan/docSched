import { Controller, Get, Post, Body, Patch, Param, Delete, Req, HttpCode } from '@nestjs/common';
import { OptionService } from './option.service';
import { CreateOptionDto } from './dto/create-option.dto';
import { UpdateOptionDto } from './dto/update-option.dto';
import { Request } from 'express';

@Controller('option')
export class OptionController {
  constructor(private readonly optionService: OptionService) {}

  @Post()
  create(@Body() createOptionDto: CreateOptionDto) {
    return this.optionService.create(createOptionDto);
  }


  @Get()
  findOne(@Req() request: Request) {
    const optionId = request.user.optionId;
    return this.optionService.findOne(optionId);
  }

  @HttpCode(200)
  @Post('update')
  update(@Req() request: Request, @Body() updateOptionDto: UpdateOptionDto) {
    const optionId = request.user.optionId;
    return this.optionService.update(optionId, updateOptionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.optionService.remove(+id);
  }
}
