import { PartialType } from '@nestjs/mapped-types';
import { CreateHackathonDto } from './create-hackathon.dto';

export class UpdateHackathonDto extends PartialType(CreateHackathonDto) {}
