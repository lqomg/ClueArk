import { ArrayMaxSize, ArrayMinSize, IsArray, IsMongoId } from 'class-validator';

export class PatchMonitorSourcesDto {
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(50)
  @IsMongoId({ each: true })
  sourceIds!: string[];
}
