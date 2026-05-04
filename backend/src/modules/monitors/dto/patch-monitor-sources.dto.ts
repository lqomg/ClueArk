import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsMongoId, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class PatchMonitorSourcesDto {
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(50)
  @IsMongoId({ each: true })
  sourceIds!: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  minCosine?: number;
}
