import Handlebars from 'handlebars';

export function renderTemplate(
  template: string,
  context: Record<string, unknown>,
): string {
  return Handlebars.compile(template, { noEscape: true })(context);
}
