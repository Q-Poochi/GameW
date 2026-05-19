/**
 * Vietnamese Word Database - Loads from JSON files
 * Loads topic dictionaries at server startup into memory Sets for O(1) lookup.
 */

const fs = require('fs');
const path = require('path');

// Topic file mapping
const TOPIC_FILES = {
  'Thực phẩm': 'thuc_pham.json',
  'Động vật': 'dong_vat.json',
  'Thể thao': 'the_thao.json',
  'Màu sắc': 'mau_sac.json',
  'Địa danh': 'dia_danh.json',
  'Nghề nghiệp': 'nghe_nghiep.json'
};

// In-memory Sets for fast lookup (loaded once at startup)
const topicSets = {};       // { topicName: Set<string> }
const topicArrays = {};     // { topicName: string[] }
const allWordsSet = new Set(); // Master set of ALL words across all topics

/**
 * Load all topic dictionaries from JSON files into memory
 */
function loadDictionaries() {
  const dataDir = path.join(__dirname, 'data', 'topics');

  for (const [topicName, fileName] of Object.entries(TOPIC_FILES)) {
    const filePath = path.join(dataDir, fileName);
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const words = JSON.parse(raw);

      // Normalize and store as Set for O(1) lookup
      const normalizedWords = words.map(w => w.toLowerCase().trim());
      topicSets[topicName] = new Set(normalizedWords);
      topicArrays[topicName] = normalizedWords;

      // Add to master set
      normalizedWords.forEach(w => allWordsSet.add(w));

      console.log(`  ✓ ${topicName}: ${normalizedWords.length} từ`);
    } catch (err) {
      console.error(`  ✗ Lỗi đọc ${fileName}:`, err.message);
      topicSets[topicName] = new Set();
      topicArrays[topicName] = [];
    }
  }

  console.log(`  📚 Tổng cộng: ${allWordsSet.size} từ duy nhất`);
}

// Load dictionaries when module is first imported
console.log('📖 Loading dictionaries...');
loadDictionaries();

/**
 * Get all words for a specific topic
 */
function getWordsForTopic(topic) {
  return topicArrays[topic] || [];
}

/**
 * Get all available topics
 */
function getTopics() {
  return Object.keys(TOPIC_FILES);
}

/**
 * Check if a word/phrase exists in a topic's dictionary
 * STRICT matching using Set for O(1) performance
 */
function isWordInTopic(phrase, topic) {
  const normalizedPhrase = phrase.toLowerCase().trim();
  const topicSet = topicSets[topic];
  if (!topicSet) return false;

  // 1. Exact match (O(1) via Set)
  if (topicSet.has(normalizedPhrase)) {
    return true;
  }

  // 2. Strict containment check with minimum length
  //    Only match if input contains a dictionary phrase (≥4 chars)
  //    or a dictionary phrase contains the input (≥4 chars)
  const words = topicArrays[topic] || [];
  for (const word of words) {
    if (word.length >= 4 && normalizedPhrase.length >= 4) {
      if (normalizedPhrase.includes(word) && word.length >= 4) return true;
      if (word.includes(normalizedPhrase) && normalizedPhrase.length >= 4) return true;
    }
  }

  // 3. Not found in this topic
  return false;
}

/**
 * Check if a word exists in ANY topic (general validity check)
 */
function isWordInAnyTopic(phrase) {
  const normalizedPhrase = phrase.toLowerCase().trim();
  return allWordsSet.has(normalizedPhrase);
}

/**
 * Check if a phrase looks like a real word/phrase
 * Basic validation - at least 2 characters, contains Vietnamese/English letters
 */
function looksLikeRealWord(phrase) {
  const trimmed = phrase.trim();
  if (trimmed.length < 2) return false;
  if (!/[a-zA-Zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(trimmed)) return false;
  return true;
}

module.exports = {
  getWordsForTopic,
  getTopics,
  isWordInTopic,
  isWordInAnyTopic,
  looksLikeRealWord,
  topicSets,
  allWordsSet
};
