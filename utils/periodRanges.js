// Date ranges (YYYY-MM-DD, India time) used by the "today / this week / this month" cards.
const shiftDays = (iso, n) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const weekStart = (iso) => shiftDays(iso, -((new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7)); // Monday

const periodRanges = (today) => ({
  today: [today, today],
  week: [weekStart(today), today],
  last7: [shiftDays(today, -6), today],
  month: [`${today.slice(0, 7)}-01`, today],
  last30: [shiftDays(today, -29), today],
  year: [`${today.slice(0, 4)}-01-01`, today],
});

module.exports = { shiftDays, weekStart, periodRanges };
