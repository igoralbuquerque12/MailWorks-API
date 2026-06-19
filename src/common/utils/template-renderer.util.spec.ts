import { BadRequestException } from '@nestjs/common';
import { renderTemplate } from './template-renderer.util';

describe('renderTemplate', () => {
  it('replaces every declared variable', () => {
    expect(
      renderTemplate('Ola {{ name }}, codigo {{code}}', {
        name: 'Ana',
        code: '123456',
      }),
    ).toBe('Ola Ana, codigo 123456');
  });

  it('reports missing variables', () => {
    expect(() =>
      renderTemplate('Ola {{name}} {{code}}', { name: 'Ana' }),
    ).toThrow(BadRequestException);
  });
});
