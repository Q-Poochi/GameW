/**
 * Vietnamese Word Database - Loads from JSON files
 * Loads topic dictionaries at server startup into memory Sets for O(1) lookup.
 */

const fs = require('fs');
const path = require('path');

// Topic file mapping
const TOPIC_FILES = {
  'Tổng hợp': 'Topic.json'
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
      const parsed = JSON.parse(raw);
      const words = Array.isArray(parsed) ? parsed : (parsed.topics || []);

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

// Words that should NEVER be used as starting words
const BAD_START_WORDS = new Set([
  'nay', 'ờ', 'u', 'heo', 'mộ', 'tang', 'mươi', 'mầu', 'ngùy', 'thọ',
  'ẹ', 'giãn', 'mẽ', 'sau', 'muffin', 'đoan', 'kế', 'đẩu', 'dưới', 'độ',
  'chải', 'chua', 'đến', 'lém', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu',
  'bảy', 'tám', 'chín', 'mười', 'lường', 'đâu', 'tôi', 'rươi',
  'kép', 'khanh', 'tạng', 'ró', 'đớp', 'quẻ', 'ừ', 'tái', 'bẫm', 'tịch',
  'giỏi', 'miệng', 'suất', 'sẽ', 'đạm', 'hoạch', 'nhiên', 'nhựa', 'dơi',
  'đụi', 'đò', 'bi', 'rem', 'mà',
  // Numbers
  'mười một', 'mười hai', 'mười ba', 'mười bốn', 'mười lăm',
  'mười sáu', 'mười bảy', 'mười tám', 'mười chín', 'hai mươi',
  // Single-char / pronouns / prepositions
  'và', 'hoặc', 'nhưng', 'vì', 'nên', 'nếu', 'thì', 'như', 'hơn',
  'kém', 'bằng', 'cùng', 'với', 'cho', 'của', 'ở', 'tại', 'từ',
  'qua', 'vào', 'ra', 'lên', 'xuống', 'về', 'theo',
  'đây', 'đó', 'kia', 'này', 'nọ', 'ai', 'sao',
  'rất', 'hơi', 'quá', 'bạn', 'họ',
  // Months / days
  'thứ hai', 'thứ ba', 'thứ tư', 'thứ năm', 'thứ sáu', 'thứ bảy', 'chủ nhật',
  'tháng một', 'tháng hai', 'tháng ba', 'tháng tư', 'tháng năm',
  'tháng sáu', 'tháng bảy', 'tháng tám', 'tháng chín', 'tháng mười',
  'tháng mười một', 'tháng mười hai'
]);

// Pre-build the good starting words array (2 syllables, not blacklisted)
const goodStartWords = [];

function buildStartWords() {
  for (const word of allWordsArray) {
    const syllables = word.split(/\s+/);
    if (syllables.length === 2 && !BAD_START_WORDS.has(word)) {
      goodStartWords.push(word);
    }
  }
  console.log(`  🎯 Từ bắt đầu hợp lệ: ${goodStartWords.length} từ`);
}

// Build start words after dictionaries are loaded
buildStartWords();

/**
 * Get a random word from the good starting words pool
 */
function getRandomWord() {
  if (goodStartWords.length === 0) return 'bắt đầu';
  const randomIndex = Math.floor(Math.random() * goodStartWords.length);
  return goodStartWords[randomIndex];
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
