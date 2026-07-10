export function safeParseAIResponse(raw) {
  // If already object/array, return as-is
  if (raw === null || raw === undefined) throw new Error('Empty AI response');
  if (typeof raw === 'object') return raw;

  let s = String(raw).trim();

  // If response is like: response: { ... } or contains JSON snippet, extract the first JSON block
  const firstBrace = s.indexOf('{');
  const firstBracket = s.indexOf('[');
  if (firstBrace !== -1 || firstBracket !== -1) {
    const start = (firstBracket !== -1 && firstBracket < firstBrace) ? firstBracket : firstBrace;
    const endBrace = s.lastIndexOf('}');
    const endBracket = s.lastIndexOf(']');
    let end = Math.max(endBrace, endBracket);
    if (end > start) s = s.slice(start, end + 1);
  }

  // Try direct parse
  try { return JSON.parse(s); } catch (e) {}

  // Heuristic fixes:
  //  - Replace single quotes with double quotes
  //  - Remove trailing commas before } or ]
  let fixed = s.replace(/\r?\n/g, ' ')
               .replace(/\s+/g, ' ')
               .replace(/'/g, '"')
               .replace(/,\s*([}\]])/g, '$1');

  // Ensure property names are quoted: convert unquoted keys to quoted keys
  fixed = fixed.replace(/([,{\s])(\w+)\s*:/g, '$1"$2":');

  try { return JSON.parse(fixed); } catch (e) {
    // As a last resort, throw original parse error
    throw new Error('Failed to parse AI response as JSON');
  }
}
