import { Type } from 'class-transformer';
import { IsNumber, IsString, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  public name: string;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Type(() => Number)
  @Min(0)
  public price: number;
}
