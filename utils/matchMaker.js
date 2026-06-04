function balanceTeams(queue) {
  const sorted = [...queue].sort((a, b) => b.rating - a.rating);
  const teamA = { players: [], total: 0 };
  const teamB = { players: [], total: 0 };
  const targetA = Math.ceil(sorted.length / 2);
  const targetB = Math.floor(sorted.length / 2);

  for (const player of sorted) {
    const canAddA = teamA.players.length < targetA;
    const canAddB = teamB.players.length < targetB;

    if (!canAddA) {
      teamB.players.push(player);
      teamB.total += player.rating;
      continue;
    }
    if (!canAddB) {
      teamA.players.push(player);
      teamA.total += player.rating;
      continue;
    }

    if (teamA.total <= teamB.total) {
      teamA.players.push(player);
      teamA.total += player.rating;
    } else {
      teamB.players.push(player);
      teamB.total += player.rating;
    }
  }

  return { teamA, teamB };
}

function formatTeamField(teamName, team) {
  return {
    name: `${teamName} — Total Rating: ${team.total}`,
    value: team.players.length
      ? team.players.map((player, index) => `${index + 1}. **${player.name}** — ${player.rating}`).join('\n')
      : 'No players assigned',
    inline: true,
  };
}

module.exports = { balanceTeams, formatTeamField };
