import { ArrayMinSize, IsArray, IsMongoId } from 'class-validator';

export class BatchDeleteSourcesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsMongoId({ each: true })
  ids: string[];
}
