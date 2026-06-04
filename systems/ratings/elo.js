function calculateElo(oldRatingA, oldRatingB, scoreA, scoreB, k = 32) {
  const expectedA = 1 / (1 + Math.pow(10, (oldRatingB - oldRatingA) / 400));
  const expectedB = 1 / (1 + Math.pow(10, (oldRatingA - oldRatingB) / 400));
  const actualA = scoreA > scoreB ? 1 : scoreA === scoreB ? 0.5 : 0;
  const actualB = scoreB > scoreA ? 1 : scoreA === scoreB ? 0.5 : 0;

  const newA = Math.round(oldRatingA + k * (actualA - expectedA));
  const newB = Math.round(oldRatingB + k * (actualB - expectedB));
  return { newA, newB, deltaA: newA - oldRatingA, deltaB: newB - oldRatingB };
}

module.exports = { calculateElo };
