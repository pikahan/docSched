import { PartialType } from '@nestjs/mapped-types';
import { CreateQqChannelDto } from './create-qq-channel.dto';

export class UpdateQqChannelDto extends PartialType(CreateQqChannelDto) {}
