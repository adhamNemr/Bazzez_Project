/**
 * 🌍 Arabic Text Helper Utility
 * Provides basic RTL support and character reshaping for PDF & Thermal Printing.
 */

/**
 * Basic Arabic Reverser/Shaper
 * This is a lightweight alternative to full shaping libraries.
 * It primarily reverses Arabic words to fix PDFKit's LTR display issue.
 */
function fixArabic(text) {
    if (!text) return "";
    
    // Check if text contains Arabic characters
    const arabicPattern = /[\u0600-\u06FF\u0750-\u077F]/;
    if (!arabicPattern.test(text)) return text;

    // Handle sentences: reverse each word's order but keep sentences logical
    // Note: Professional shaping requires complex logic for joining letters.
    // This is a "good enough" fix for PDFKit when used with a proper font.
    return text.split(' ').map(word => {
        if (arabicPattern.test(word)) {
            return word.split('').reverse().join('');
        }
        return word;
    }).reverse().join(' ');
}

module.exports = { fixArabic };
