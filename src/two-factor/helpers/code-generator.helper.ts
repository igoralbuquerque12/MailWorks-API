import { Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';

@Injectable()
export class CodeGeneratorHelper {
  generateNumericCode(length: number = 6): string {
    if (length <= 0) return '';

    const min = 0;
    const max = Math.pow(10, length);

    const code = randomInt(min, max);

    return code.toString().padStart(length, '0');
  }
}
