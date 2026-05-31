export const REGEX_STRIP_SCRIPTS = /<script[^>]*>[\s\S]*?<\/script>/gi;
export const REGEX_STRIP_STYLES = /<style[^>]*>[\s\S]*?<\/style>/gi;
export const REGEX_STRIP_TAGS = /<[^>]+>/g;
export const REGEX_STRIP_ENTITIES = /&[^;]+;/g;
export const REGEX_COLLAPSE_WHITESPACE = /\s+/g;
export const REGEX_EXTRACT_JSON = /\{[\s\S]*\}/;
