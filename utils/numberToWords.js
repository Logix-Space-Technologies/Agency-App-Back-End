// CommonJS port of the frontend's src/utils/numberToWords.js — kept in sync
// manually so PDF invoices (server-rendered) show the same "Amount in Words"
// as the browser-printed receipts.
const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];

const threeDigitsToWords = (num) => {
  let str = "";
  if (num >= 100) {
    str += `${ONES[Math.floor(num / 100)]} Hundred`;
    num %= 100;
    if (num) str += " ";
  }
  if (num >= 20) {
    str += TENS[Math.floor(num / 10)];
    if (num % 10) str += ` ${ONES[num % 10]}`;
  } else if (num > 0) {
    str += ONES[num];
  }
  return str;
};

const integerToIndianWords = (num) => {
  if (num === 0) return "Zero";

  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const hundred = num;

  const parts = [];
  if (crore) parts.push(`${threeDigitsToWords(crore)} Crore`);
  if (lakh) parts.push(`${threeDigitsToWords(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigitsToWords(thousand)} Thousand`);
  if (hundred) parts.push(threeDigitsToWords(hundred));

  return parts.join(" ");
};

function amountToWords(amount) {
  const value = Math.abs(Number(amount) || 0);
  const rupees = Math.floor(value);
  const paise = Math.round((value - rupees) * 100);

  let words = `Rupees ${integerToIndianWords(rupees)}`;
  if (paise > 0) {
    words += ` and ${integerToIndianWords(paise)} Paise`;
  }
  words += " Only";
  return words;
}

module.exports = { amountToWords };
