import { BadRequestException, PipeTransform } from '@nestjs/common';
import { ZodSchema } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException(
        result.error.issues

          .map(
            (e: any) =>
              `${(e.path as (string | number)[]).join('.')}: ${e.message as string}`,
          )
          .join(', '),
      );
    }
    return result.data;
  }
}
