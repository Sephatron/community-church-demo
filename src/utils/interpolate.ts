/**
 * Token interpolation helper.
 *
 * Replaces `{key}` tokens in a template string with matching values from a
 * tokens object.  Tokens that have no corresponding key in the map are left
 * as-is so a partially-wired template degrades gracefully rather than
 * silently dropping text.
 *
 * Usage:
 *   interpolate("We meet at {venue}, {area}", { venue: "The Beehive", area: "Honiton" })
 *   // → "We meet at The Beehive, Honiton"
 *
 * The admin sees the template with tokens visible in Sveltia; a hint on each
 * field explains that {venue}, {time}, etc. are filled automatically from
 * Site Settings.
 */
export function interpolate(
  template: string,
  tokens: Record<string, string>
): string {
  return template.replace(/\{(\w+)\}/g, (_match, key) => {
    return Object.prototype.hasOwnProperty.call(tokens, key) ? tokens[key] : `{${key}}`;
  });
}
