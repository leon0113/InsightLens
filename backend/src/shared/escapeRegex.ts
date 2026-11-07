// Search text is matched literally, so characters like "(" or "*" cannot form a pattern.
const escapeRegex = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export default escapeRegex;
