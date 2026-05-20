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
const allWordsSet = new Set(); // Master set of ALL words
const allWordsArray = [];      // Array for random selection and containment check

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

      // Normalize
      const normalizedWords = words.map(w => w.toLowerCase().trim());

      // Add to master set and array
      normalizedWords.forEach(w => {
        if (!allWordsSet.has(w)) {
          allWordsSet.add(w);
          allWordsArray.push(w);
        }
      });

      console.log(`  ✓ ${topicName}: ${normalizedWords.length} từ`);
    } catch (err) {
      console.error(`  ✗ Lỗi đọc ${fileName}:`, err.message);
    }
  }

  console.log(`  📚 Tổng cộng: ${allWordsSet.size} từ duy nhất`);
}

// Load dictionaries when module is first imported
console.log('📖 Loading dictionaries...');
loadDictionaries();

/**
 * Get a random word from the global dictionary
 */
function getRandomWord() {
  if (allWordsArray.length === 0) return 'bắt đầu';
  const randomIndex = Math.floor(Math.random() * allWordsArray.length);
  return allWordsArray[randomIndex];
}

/**
 * Check if a word/phrase exists in the global dictionary
 * STRICT matching using Set for O(1) performance
 */
function isValidWord(phrase) {
  const normalizedPhrase = phrase.toLowerCase().trim();
  
  // 1. Exact match (O(1) via Set)
  if (allWordsSet.has(normalizedPhrase)) {
    return true;
  }

  // 2. Strict containment check with minimum length
  //    Only match if input contains a dictionary phrase (≥4 chars)
  //    or a dictionary phrase contains the input (≥4 chars)
  for (const word of allWordsArray) {
    if (word.length >= 4 && normalizedPhrase.length >= 4) {
      if (normalizedPhrase.includes(word) && word.length >= 4) return true;
      if (word.includes(normalizedPhrase) && normalizedPhrase.length >= 4) return true;
    }
  }

  // 3. Not found
  return false;
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
  getRandomWord,
  isValidWord,
  looksLikeRealWord,
  allWordsSet,
  allWordsArray
};
