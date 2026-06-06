import { BadRequestException } from '@nestjs/common';

const VARIABLE_PATTERN = /{{\s*([a-zA-Z0-9_.-]+)\s*}}/g;

/**
 * Renders simple `{{variable}}` placeholders and rejects missing variables.
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string>,
): string {
  const missing = new Set<string>();
  const rendered = template.replace(VARIABLE_PATTERN, (_match, key: string) => {
    if (!(key in variables)) {
      missing.add(key);
      return '';
    }
    return String(variables[key]);
  });

  if (missing.size > 0) {
    throw new BadRequestException(
      `Missing template variables: ${Array.from(missing).join(', ')}`,
    );
  }

  return rendered;
}
