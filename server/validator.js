/**
 * 3-Layer Validation System for Word Chain Game
 * Layer 1: Logic Check (chaining + duplicates)
 * Layer 2: Dictionary + Topic Check
 * Layer 3: Player Voting (handled via Socket events)
 */

const { isWordInTopic, looksLikeRealWord } = require('./wordDatabase');

/**
 * Extract the last word from a phrase
 */
function getLastWord(phrase) {
  return phrase.trim().split(/\s+/).pop().toLowerCase();
}

/**
 * Extract the first word from a phrase
 */
function getFirstWord(phrase) {
  return phrase.trim().split(/\s+/)[0].toLowerCase();
}

/**
 * Layer 1: Logic Check
 * - Check if word chains correctly (last word of previous = first word of new)
 * - Check if word is not a duplicate
 */
function validateChaining(lastPhrase, newPhrase) {
  if (!lastPhrase) return { valid: true }; // First word in round

  const lastWord = getLastWord(lastPhrase);
  const firstWord = getFirstWord(newPhrase);

  if (lastWord !== firstWord) {
    return {
      valid: false,
      reason: `Từ phải bắt đầu bằng "${lastWord}" nhưng bạn bắt đầu bằng "${firstWord}"`
    };
  }

  return { valid: true };
}

function validateNoDuplicate(newPhrase, usedWords) {
  const normalized = newPhrase.toLowerCase().trim();
  if (usedWords.some(w => w.toLowerCase().trim() === normalized)) {
    return {
      valid: false,
      reason: `"${newPhrase}" đã được sử dụng trong vòng này rồi!`
    };
  }
  return { valid: true };
}

/**
 * Layer 2: Dictionary + Topic Check
 * Check if the word exists in our dictionary and matches the topic
 */
function validateDictionary(newPhrase, topic) {
  if (!looksLikeRealWord(newPhrase)) {
    return {
      valid: false,
      reason: `"${newPhrase}" không giống từ/cụm từ hợp lệ`
    };
  }

  if (isWordInTopic(newPhrase, topic)) {
    return { valid: true, source: 'dictionary' };
  }

  // Word not found in dictionary - needs voting
  return { valid: null, reason: 'not_in_dictionary' };
}

/**
 * Full validation pipeline
 * Returns:
 *   { valid: true } - accepted
 *   { valid: false, reason: "..." } - rejected
 *   { valid: null, needsVoting: true } - needs player vote
 */
function validateWord(newPhrase, lastPhrase, usedWords, topic) {
  // Sanitize input
  const trimmed = newPhrase.trim();
  if (!trimmed || trimmed.length === 0) {
    return { valid: false, reason: 'Vui lòng nhập một từ/cụm từ' };
  }

  if (trimmed.length > 100) {
    return { valid: false, reason: 'Từ/cụm từ quá dài (tối đa 100 ký tự)' };
  }

  // Layer 1: Logic checks
  const chainingResult = validateChaining(lastPhrase, trimmed);
  if (!chainingResult.valid) return chainingResult;

  const duplicateResult = validateNoDuplicate(trimmed, usedWords);
  if (!duplicateResult.valid) return duplicateResult;

  // Layer 2: Dictionary check
  const dictResult = validateDictionary(trimmed, topic);

  if (dictResult.valid === true) {
    return { valid: true, source: 'dictionary' };
  }

  if (dictResult.valid === false) {
    return dictResult;
  }

  // Layer 2 inconclusive - need voting (Layer 3)
  return { valid: null, needsVoting: true };
}

module.exports = {
  validateWord,
  validateChaining,
  validateNoDuplicate,
  validateDictionary,
  getLastWord,
  getFirstWord
};
