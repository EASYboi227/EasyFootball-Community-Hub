/* EasyFootball tournament data */
let tournamentPlayers = [];
let currentRoundPlayers = [];
let currentRound = 1;
let roundWinners = [];
let activeTournamentId = localStorage.getItem("easyFootballActiveTournament") || null;
let tournaments = loadTournaments();

function loadTournaments() {
  try { return JSON.parse(localStorage.getItem("easyFootballTournaments")) || []; }
  catch { return []; }
}

function saveTournaments() {
  localStorage.setItem("easyFootballTournaments", JSON.stringify(tournaments));
}

function scrollToCreate() {
  document.getElementById("create").scrollIntoView({ behavior: "smooth" });
}

function formatChanged() {
  const format = document.getElementById("tournamentFormat").value;
  document.getElementById("groupOptions").classList.toggle(
    "show", format === "group" || format === "group-knockout"
  );
}

function getFormatName(format) {
  return { knockout: "Knockout", group: "Group Stage", "group-knockout": "Group Stage + Knockout", league: "League" }[format];
}

function generatePlayers() {
  const count = Number(document.getElementById("playerCount").value);
  const inputs = document.getElementById("playerInputs");
  inputs.replaceChildren();
  for (let i = 1; i <= count; i++) {
    const input = document.createElement("input");
    input.type = "text"; input.id = `player${i}`; input.placeholder = `Player ${i} name`;
    const wrapper = document.createElement("div"); wrapper.className = "player-input"; wrapper.append(input);
    inputs.append(wrapper);
  }
  document.getElementById("createButton").hidden = false;
  inputs.scrollIntoView({ behavior: "smooth", block: "center" });
}

/* This remains the form's existing entry point. It now creates a complete
   tournament record before updating the current-tournament display. */
function createTournament() {
  const name = document.getElementById("tournamentName").value.trim();
  const count = Number(document.getElementById("playerCount").value);
  const format = document.getElementById("tournamentFormat").value;
  const result = document.getElementById("tournamentResult");
  if (!name) return showMessage("Please enter a tournament name.", true);

  const players = [];
  for (let i = 1; i <= count; i++) {
    const input = document.getElementById(`player${i}`);
    const player = input && input.value.trim();
    if (!player) return showMessage(`Please enter Player ${i}'s name.`, true);
    players.push(player);
  }

  const tournament = {
    id: `EF-${Date.now().toString(36).toUpperCase()}`,
    name, playerCount: count, format, players,
    status: "Active", champion: "", createdAt: new Date().toISOString(),
    currentRoundPlayers: format === "knockout" ? [...players] : [], currentRound: 1, roundWinners: []
  };
  tournaments.push(tournament);
  activeTournamentId = tournament.id;
  localStorage.setItem("easyFootballActiveTournament",activeTournamentId);
  saveTournaments();
  openTournament(tournament.id, false);
  renderTournamentDashboard();
  showMessage("🏆 Tournament created successfully!");
  document.getElementById("tournament").scrollIntoView({ behavior: "smooth" });
}

function showMessage(message, isError = false) {
  const result = document.getElementById("tournamentResult");
  result.style.color = isError ? "#c62828" : "#00a85a";
  result.textContent = message;
}

function getActiveTournament() {
  return tournaments.find(tournament => tournament.id === activeTournamentId);
}

function renderTournamentDashboard() {
  const grid = document.getElementById("tournamentGrid");
  grid.replaceChildren();
  if (!tournaments.length) {
    const empty = document.createElement("div"); empty.className = "ef-empty";
    empty.innerHTML = "<div>🏆</div><h3>No tournaments yet</h3><p>Create your first tournament to see it here.</p>";
    grid.append(empty); return;
  }
  tournaments.forEach(tournament => {
    const card = document.createElement("article"); card.className = "ef-tournament-card";
    const top = document.createElement("div"); top.className = "ef-card-top";
    const status = document.createElement("span"); status.className = "ef-status"; status.textContent = "● " + tournament.status;
    const id = document.createElement("span"); id.textContent = tournament.id;
    top.append(status, id);
    const title = document.createElement("h3"); title.textContent = tournament.name;
    const meta = document.createElement("div"); meta.className = "ef-tournament-meta";
    const playerTotal = document.createElement("span"); playerTotal.textContent = `${tournament.players.length}/${tournament.playerCount} players`;
    const format = document.createElement("span"); format.textContent = getFormatName(tournament.format);
    meta.append(playerTotal, format);
    const open = document.createElement("button"); open.className = "ef-open-btn"; open.type = "button"; open.textContent = "Open Tournament";
    open.addEventListener("click", () => openTournament(tournament.id));
    card.append(top, title, meta, open); grid.append(card);
  });
}

function openTournament(id, shouldScroll = true) {
  const tournament = tournaments.find(item => item.id === id);
  if (!tournament) return;
  activeTournamentId = id;
  tournamentPlayers = [...tournament.players];
  currentRoundPlayers = [...(tournament.currentRoundPlayers || [])];
  currentRound = tournament.currentRound || 1;
  roundWinners = [...(tournament.roundWinners || [])];
  updateTournamentView(tournament);
  displayPlayers();
  if (tournament.format === "knockout" && currentRoundPlayers.length > 1 && !tournament.champion) startKnockout();
  if (shouldScroll) document.getElementById("tournament").scrollIntoView({ behavior: "smooth" });
}

function updateTournamentView(tournament) {
  document.getElementById("currentTournament").textContent = tournament.name;
  document.getElementById("totalPlayers").textContent = tournament.playerCount;
  document.getElementById("currentFormat").textContent = getFormatName(tournament.format);
  document.getElementById("championName").textContent = tournament.champion || "🏆";
  document.getElementById("tournamentDescription").textContent = `${tournament.playerCount} players • ${getFormatName(tournament.format)}`;
  displayTournamentSettings(tournament);
}

function displayTournamentSettings(tournament) {
  const settings = document.getElementById("tournamentSettings");
  const knockout = tournament.format === "knockout" || tournament.format === "group-knockout";
  const rule = tournament.format === "league" ? "League points apply: 3 points for a win, 1 point for a draw." : knockout ? "A drawn knockout match is decided on penalties; the winner advances." : "Group matches can end in a draw: 3 points for a win, 1 point for a draw.";
  settings.innerHTML = `<h3>Tournament Rules</h3><p><strong>Tournament Format:</strong> ${getFormatName(tournament.format)}</p><p><strong>Players:</strong> ${tournament.playerCount}</p><p><strong>Match Time:</strong> 10 Minutes</p><p><strong>Extra Time:</strong> ${knockout ? "On" : "Off"}</p><p><strong>Penalties:</strong> ${knockout ? "On" : "Off"}</p><p><strong>Format Rule:</strong> ${rule}</p>`;
  settings.hidden = false;
}

function displayPlayers() {
  const list = document.getElementById("playersList"); list.replaceChildren();
  tournamentPlayers.forEach(player => {
    const card = document.createElement("article"); card.className = "player-card";
    const icon = document.createElement("div"); icon.className = "player-icon"; icon.textContent = "👤";
    const title = document.createElement("h3"); title.textContent = player;
    const label = document.createElement("p"); label.textContent = "⚡ Competitor";
    card.append(icon, title, label); list.append(card);
  });
}

function startKnockout() {
  const section = document.getElementById("knockoutSection"); section.hidden = false;
  if (!currentRoundPlayers.length) currentRoundPlayers = [...tournamentPlayers];
  generateRound();
}

function generateRound() {
  const container = document.getElementById("roundContainer"); container.replaceChildren();
  const count = currentRoundPlayers.length;
  const title = count === 2 ? "FINAL" : count === 4 ? "SEMI-FINALS" : count === 8 ? "QUARTER-FINALS" : `ROUND OF ${count}`;
  const round = document.createElement("div"); round.className = "round";
  const heading = document.createElement("h3"); heading.className = "round-title"; heading.textContent = title;
  const matches = document.createElement("div"); matches.className = "round-matches";
  for (let i = 0; i < count; i += 2) matches.append(buildMatch(i / 2, currentRoundPlayers[i], currentRoundPlayers[i + 1]));
  round.append(heading, matches); container.append(round);
}

function buildMatch(index, player1, player2) {
  const card = document.createElement("article"); card.className = "knockout-match";
  const scoreInputs = [];
  [player1, player2].forEach(player => {
    const row = document.createElement("div"); row.className = "knockout-player";
    const name = document.createElement("span"); name.textContent = player;
    const input = document.createElement("input"); input.type = "number"; input.min = "0"; input.placeholder = "0";
    scoreInputs.push(input); row.append(name, input); card.append(row);
  });
  const penalty = document.createElement("div"); penalty.hidden = true;
  const notice = document.createElement("p"); notice.textContent = "Match drawn. Enter penalty shootout scores."; penalty.append(notice);
  const penaltyInputs = [];
  [player1, player2].forEach(player => { const row = document.createElement("div"); row.className = "knockout-player"; const name = document.createElement("span"); name.textContent = `${player} penalties`; const input = document.createElement("input"); input.type = "number"; input.min = "0"; input.placeholder = "0"; penaltyInputs.push(input); row.append(name, input); penalty.append(row); });
  const button = document.createElement("button"); button.className = "submit-result"; button.type = "button"; button.textContent = "Submit Result";
  const winnerBox = document.createElement("div"); winnerBox.className = "match-winner";
  button.addEventListener("click", () => submitMatch(index, player1, player2, scoreInputs, penaltyInputs, penalty, winnerBox, button));
  card.append(button, penalty, winnerBox); return card;
}

function submitMatch(index, player1, player2, scores, penalties, penaltyBox, winnerBox, button) {
  if (scores.some(input => input.value === "")) return setWinnerMessage(winnerBox, "Please enter both scores.", true);
  const [score1, score2] = scores.map(input => Number(input.value)); let winner; let text;
  if (score1 === score2) {
    penaltyBox.hidden = false;
    if (penalties.some(input => input.value === "")) return setWinnerMessage(winnerBox, "Match drawn. Enter both penalty scores to choose the winner.", true);
    const [penalty1, penalty2] = penalties.map(input => Number(input.value));
    if (penalty1 === penalty2) return setWinnerMessage(winnerBox, "Penalty scores must be different. Continue the shootout and enter the final scores.", true);
    winner = penalty1 > penalty2 ? player1 : player2; text = `Winner: ${winner} (${score1}-${score2}, ${penalty1}-${penalty2} on penalties)`;
  } else { winner = score1 > score2 ? player1 : player2; text = `🏆 Winner: ${winner}`; }
  setWinnerMessage(winnerBox, text); button.disabled = true; roundWinners[index] = winner; persistRound(); checkRoundComplete();
}

function setWinnerMessage(box, message, error = false) { box.style.color = error ? "#c62828" : "#00a85a"; box.textContent = message; }

function persistRound() { const active = getActiveTournament(); if (!active) return; active.currentRoundPlayers = [...currentRoundPlayers]; active.currentRound = currentRound; active.roundWinners = [...roundWinners]; saveTournaments(); }

function checkRoundComplete() {
  const expected = currentRoundPlayers.length / 2;
  if (roundWinners.length !== expected || roundWinners.some(winner => !winner)) return;
  const winners = [...roundWinners]; roundWinners = [];
  if (winners.length === 1) return showChampion(winners[0]);
  currentRoundPlayers = winners; currentRound++; persistRound(); generateRound();
}

function showChampion(champion) {
  const active = getActiveTournament(); if (active) { active.champion = champion; active.status = "Completed"; active.currentRoundPlayers = []; active.roundWinners = []; saveTournaments(); }
  document.getElementById("championName").textContent = champion;
  document.getElementById("roundContainer").innerHTML = `<div class="champion"><div style="font-size:60px">🏆</div><p>TOURNAMENT CHAMPION</p><h2></h2><p>Congratulations!</p></div>`;
  document.querySelector(".champion h2").textContent = champion;
  renderTournamentDashboard();
}

document.addEventListener("DOMContentLoaded", renderTournamentDashboard);

/* Group and league competition ------------------------------------------------
   These small helpers extend the existing tournament record instead of using
   another unrelated set of variables. */
function buildFixtures(players, groupCount) {
  const groups = Array.from({ length: groupCount }, (_, index) => ({
    name: `Group ${String.fromCharCode(65 + index)}`,
    players: []
  }));
  players.forEach((player, index) => groups[index % groupCount].players.push(player));
  const fixtures = [];
  groups.forEach(group => {
    for (let home = 0; home < group.players.length; home++) {
      for (let away = home + 1; away < group.players.length; away++) {
        fixtures.push({ id: `M-${group.name}-${home}-${away}`, group: group.name, home: group.players[home], away: group.players[away], homeScore: null, awayScore: null, completed: false });
      }
    }
  });
  return { groups, fixtures };
}

function createCompetitionData(tournament, groupCount) {
  if (tournament.format === "knockout") return;
  const count = tournament.format === "league" ? 1 : groupCount;
  const data = buildFixtures(tournament.players, count);
  tournament.groups = data.groups;
  tournament.fixtures = data.fixtures;
}

function standingsFor(tournament, group) {
  const table = group.players.map(name => ({ name, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 }));
  const lookup = name => table.find(row => row.name === name);
  (tournament.fixtures || []).filter(match => match.group === group.name && match.completed).forEach(match => {
    const home = lookup(match.home), away = lookup(match.away);
    home.played++; away.played++; home.goalsFor += match.homeScore; home.goalsAgainst += match.awayScore; away.goalsFor += match.awayScore; away.goalsAgainst += match.homeScore;
    if (match.homeScore > match.awayScore) { home.wins++; home.points += 3; away.losses++; }
    else if (match.homeScore < match.awayScore) { away.wins++; away.points += 3; home.losses++; }
    else { home.draws++; away.draws++; home.points++; away.points++; }
  });
  return table.sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) || b.goalsFor - a.goalsFor || a.name.localeCompare(b.name));
}

function renderCompetition() {
  const section = document.getElementById("competitionSection");
  const content = document.getElementById("competitionContent");
  const active = getActiveTournament();
  if (!active || active.format === "knockout") { section.hidden = true; return; }
  section.hidden = false;
  document.getElementById("competitionTitle").textContent = active.format === "league" ? "League Fixtures and Table" : "Group Fixtures and Standings";
  document.getElementById("competitionHelp").textContent = active.format === "group-knockout" ? "Record all group matches, then start the knockout stage." : "Record each match to update the table.";
  content.replaceChildren();

  const fixtureList = document.createElement("div"); fixtureList.className = "fixture-list";
  (active.fixtures || []).forEach(match => fixtureList.append(buildFixtureCard(match)));
  content.append(fixtureList);
  const groupGrid = document.createElement("div"); groupGrid.className = "group-grid";
  (active.groups || []).forEach(group => groupGrid.append(buildStandingCard(group, standingsFor(active, group))));
  content.append(groupGrid);

  if (active.format === "group-knockout" && active.fixtures.length && active.fixtures.every(match => match.completed) && !active.knockoutStarted) {
    const button = document.createElement("button"); button.type = "button"; button.textContent = "Start Knockout Stage"; button.className = "start-knockout-button";
    button.addEventListener("click", startGroupKnockout); content.append(button);
  }
}

function buildFixtureCard(match) {
  const card = document.createElement("article"); card.className = "fixture-card";
  const home = document.createElement("span"); home.textContent = match.home;
  const homeScore = document.createElement("input"); homeScore.className = "fixture-score"; homeScore.type = "number"; homeScore.min = "0"; homeScore.value = match.completed ? match.homeScore : ""; homeScore.disabled = match.completed;
  const versus = document.createElement("strong"); versus.textContent = "VS";
  const awayScore = document.createElement("input"); awayScore.className = "fixture-score"; awayScore.type = "number"; awayScore.min = "0"; awayScore.value = match.completed ? match.awayScore : ""; awayScore.disabled = match.completed;
  const away = document.createElement("span"); away.textContent = match.away;
  const button = document.createElement("button"); button.type = "button"; button.textContent = match.completed ? "Result Recorded" : `Save ${match.group} Result`; button.disabled = match.completed;
  button.addEventListener("click", () => saveFixtureResult(match.id, homeScore.value, awayScore.value));
  card.append(home, homeScore, versus, awayScore, away, button); return card;
}

function buildStandingCard(group, table) {
  const card = document.createElement("article"); card.className = "standing-card";
  const heading = document.createElement("h3"); heading.textContent = group.name;
  const tableElement = document.createElement("table"); tableElement.className = "standing-table";
  tableElement.innerHTML = "<thead><tr><th>#</th><th>Player</th><th>P</th><th>GD</th><th>Pts</th></tr></thead>";
  const body = document.createElement("tbody");
  table.forEach((row, index) => { const line = document.createElement("tr"); line.innerHTML = `<td>${index + 1}</td><td></td><td>${row.played}</td><td>${row.goalsFor - row.goalsAgainst}</td><td>${row.points}</td>`; line.children[1].textContent = row.name; body.append(line); });
  tableElement.append(body); card.append(heading, tableElement); return card;
}

function saveFixtureResult(id, homeValue, awayValue) {
  if (homeValue === "" || awayValue === "") return showMessage("Please enter both scores before saving.", true);
  const active = getActiveTournament();
  const fixture = active && active.fixtures.find(match => match.id === id);
  if (!fixture) return;
  fixture.homeScore = Number(homeValue); fixture.awayScore = Number(awayValue); fixture.completed = true;
  if (active.fixtures.every(match => match.completed) && active.format !== "group-knockout") finishTableTournament(active);
  saveTournaments(); renderCompetition(); renderTournamentDashboard();
}

function finishTableTournament(tournament) {
  const winners = tournament.groups.map(group => standingsFor(tournament, group)[0].name);
  tournament.status = "Completed";
  tournament.champion = tournament.format === "league" ? winners[0] : "Group stage complete";
  updateTournamentView(tournament);
}

function startGroupKnockout() {
  const active = getActiveTournament();
  if (!active) return;
  const qualifiers = active.groups.flatMap(group => standingsFor(active, group).slice(0, 2).map(row => row.name));
  active.knockoutStarted = true; active.status = "Knockout stage"; active.currentRoundPlayers = qualifiers; active.currentRound = 1; active.roundWinners = [];
  currentRoundPlayers = [...qualifiers]; currentRound = 1; roundWinners = [];
  saveTournaments(); updateTournamentView(active); renderTournamentDashboard(); renderCompetition(); startKnockout();
  document.getElementById("knockoutSection").scrollIntoView({ behavior: "smooth" });
}

/* Override only the two integration points so existing player and knockout
   behaviour above remains intact. */
createTournament = function () {
  const name = document.getElementById("tournamentName").value.trim();
  const count = Number(document.getElementById("playerCount").value);
  const format = document.getElementById("tournamentFormat").value;
  const groupCount = Number(document.getElementById("groupCount").value);
  if (!name) return showMessage("Please enter a tournament name.", true);
  if ((format === "group" || format === "group-knockout") && count / groupCount < 2) return showMessage("Choose fewer groups so every group has at least two players.", true);
  const players = [];
  for (let i = 1; i <= count; i++) { const input = document.getElementById(`player${i}`); const player = input && input.value.trim(); if (!player) return showMessage(`Please enter Player ${i}'s name.`, true); players.push(player); }
  const tournament = { id: `EF-${Date.now().toString(36).toUpperCase()}`, name, playerCount: count, format, players, groupCount, status: "Active", champion: "", createdAt: new Date().toISOString(), currentRoundPlayers: format === "knockout" ? [...players] : [], currentRound: 1, roundWinners: [] };
  createCompetitionData(tournament, groupCount);
  tournaments.push(tournament); activeTournamentId = tournament.id; saveTournaments(); openTournament(tournament.id, false); renderTournamentDashboard(); showMessage("🏆 Tournament created successfully!"); document.getElementById("tournament").scrollIntoView({ behavior: "smooth" });
};

const originalOpenTournament = openTournament;
openTournament = function (id, shouldScroll = true) {
  const tournament = tournaments.find(item => item.id === id);

  if(tournament){
   activeTournamentId = id;

   localStorage.setItem("easyFootballActiveTournament",activeTournamentId);
  }

  if (tournament && tournament.format !== "knockout" && !tournament.fixtures) {
    createCompetitionData(tournament, tournament.groupCount || 2);
    saveTournaments();
  }
  originalOpenTournament(id, shouldScroll);
  renderCompetition();
};

/* Screenshot proof is stored as an image in this browser's IndexedDB. This
   avoids filling the small localStorage space used for tournament records. */
function openProofDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("easyFootballProofs", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("proofs", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveProof(file, matchKey) {
  if (!file || !file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Choose an image smaller than 5 MB.");
  const tournament = getActiveTournament();
  if (!tournament) throw new Error("Open a tournament before adding proof.");
  const id = `${tournament.id}:${matchKey}`;
  const db = await openProofDatabase();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction("proofs", "readwrite");
    transaction.objectStore("proofs").put({ id, image: file, updatedAt: new Date().toISOString() });
    transaction.oncomplete = resolve; transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

async function loadProof(matchKey) {
  const tournament = getActiveTournament();
  if (!tournament) return null;
  const db = await openProofDatabase();
  const record = await new Promise((resolve, reject) => {
    const request = db.transaction("proofs", "readonly").objectStore("proofs").get(`${tournament.id}:${matchKey}`);
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
  db.close(); return record || null;
}

function addProofControl(card, matchKey) {
  const area = document.createElement("div"); area.className = "proof-area";
  const label = document.createElement("label"); label.textContent = "Match proof screenshot (optional)";
  const input = document.createElement("input"); input.type = "file"; input.accept = "image/*";
  const note = document.createElement("p"); note.className = "proof-note"; note.textContent = "Upload a result screenshot, maximum 5 MB.";
  const preview = document.createElement("img"); preview.className = "proof-preview"; preview.hidden = true;
  input.addEventListener("change", async () => {
    try { await saveProof(input.files[0], matchKey); preview.src = URL.createObjectURL(input.files[0]); preview.hidden = false; note.textContent = "Screenshot saved on this device."; }
    catch (error) { note.textContent = error.message; note.style.color = "#b42318"; }
  });
  area.append(label, input, note, preview); card.append(area);
  loadProof(matchKey).then(record => { if (record) { preview.src = URL.createObjectURL(record.image); preview.hidden = false; note.textContent = "Saved screenshot proof."; } }).catch(() => { note.textContent = "Proof storage is unavailable in this browser."; });
}

function deleteTournamentProofs(tournamentId) {
  return openProofDatabase().then(db => new Promise(resolve => {
    const transaction = db.transaction("proofs", "readwrite");
    const store = transaction.objectStore("proofs");
    const request = store.openCursor();
    request.onsuccess = () => { const cursor = request.result; if (!cursor) return; if (String(cursor.key).startsWith(`${tournamentId}:`)) cursor.delete(); cursor.continue(); };
    transaction.oncomplete = () => { db.close(); resolve(); };
  })).catch(() => {});
}

buildFixtureCard = function (match) {
  const card = document.createElement("article"); card.className = "fixture-card";
  const home = document.createElement("span"); home.textContent = match.home;
  const homeScore = document.createElement("input"); homeScore.className = "fixture-score"; homeScore.type = "number"; homeScore.min = "0"; homeScore.value = match.completed ? match.homeScore : ""; homeScore.disabled = match.completed;
  const versus = document.createElement("strong"); versus.textContent = "VS";
  const awayScore = document.createElement("input"); awayScore.className = "fixture-score"; awayScore.type = "number"; awayScore.min = "0"; awayScore.value = match.completed ? match.awayScore : ""; awayScore.disabled = match.completed;
  const away = document.createElement("span"); away.textContent = match.away;
  const button = document.createElement("button"); button.type = "button"; button.textContent = match.completed ? "Result Recorded" : `Save ${match.group} Result`; button.disabled = match.completed;
  button.addEventListener("click", () => saveFixtureResult(match.id, homeScore.value, awayScore.value));
  card.append(home, homeScore, versus, awayScore, away, button); addProofControl(card, `fixture-${match.id}`); return card;
};

buildMatch = function (index, player1, player2) {
  const card = document.createElement("article"); card.className = "knockout-match"; const scores = [];
  [player1, player2].forEach(player => { const row = document.createElement("div"); row.className = "knockout-player"; const name = document.createElement("span"); name.textContent = player; const input = document.createElement("input"); input.type = "number"; input.min = "0"; input.placeholder = "0"; scores.push(input); row.append(name, input); card.append(row); });
  const penalty = document.createElement("div"); penalty.hidden = true; const notice = document.createElement("p"); notice.textContent = "Match drawn. Enter penalty shootout scores."; penalty.append(notice); const penalties = [];
  [player1, player2].forEach(player => { const row = document.createElement("div"); row.className = "knockout-player"; const name = document.createElement("span"); name.textContent = `${player} penalties`; const input = document.createElement("input"); input.type = "number"; input.min = "0"; input.placeholder = "0"; penalties.push(input); row.append(name, input); penalty.append(row); });
  const button = document.createElement("button"); button.className = "submit-result"; button.type = "button"; button.textContent = "Submit Result"; const winnerBox = document.createElement("div"); winnerBox.className = "match-winner";
  button.addEventListener("click", () => submitMatch(index, player1, player2, scores, penalties, penalty, winnerBox, button)); card.append(button, penalty, winnerBox); addProofControl(card, `knockout-round-${currentRound}-match-${index}`); return card;
};

renderTournamentDashboard = function () {
  const grid = document.getElementById("tournamentGrid"); if (!grid) return; grid.replaceChildren();
  if (!tournaments.length) { const empty = document.createElement("div"); empty.className = "ef-empty"; empty.innerHTML = "<div>🏆</div><h3>No tournaments yet</h3><p>Create your first tournament to see it here.</p>"; grid.append(empty); return; }
  tournaments.forEach(tournament => {
    const card = document.createElement("article"); card.className = "ef-tournament-card";
    const top = document.createElement("div"); top.className = "ef-card-top"; const status = document.createElement("span"); status.className = "ef-status"; status.textContent = `● ${tournament.status}`; const id = document.createElement("span"); id.textContent = tournament.id; top.append(status, id);
    const title = document.createElement("h3"); title.textContent = tournament.name; const meta = document.createElement("div"); meta.className = "ef-tournament-meta"; const players = document.createElement("span"); players.textContent = `${tournament.players.length}/${tournament.playerCount} players`; const format = document.createElement("span"); format.textContent = getFormatName(tournament.format); meta.append(players, format);
    const open = document.createElement("button"); open.className = "ef-open-btn"; open.type = "button"; open.textContent = "Open Tournament"; open.addEventListener("click", () => openTournament(tournament.id));
    const actions = document.createElement("div"); actions.className = "ef-card-actions"; const print = document.createElement("button"); print.type = "button"; print.textContent = "Print / Save PDF"; print.addEventListener("click", () => { openTournament(tournament.id, false); window.print(); }); const remove = document.createElement("button"); remove.type = "button"; remove.className = "ef-remove-btn"; remove.textContent = "Remove"; remove.addEventListener("click", () => removeTournament(tournament.id)); actions.append(print, remove);
    card.append(top, title, meta, open, actions); grid.append(card);
  });
};

function removeTournament(id) {
  const tournament = tournaments.find(item => item.id === id); if (!tournament) return;
  if (!window.confirm(`Remove “${tournament.name}” and its saved screenshot proofs from this device?`)) return;
  tournaments = tournaments.filter(item => item.id !== id); deleteTournamentProofs(id); saveTournaments();
  if (activeTournamentId === id) { activeTournamentId = tournaments[0] ? tournaments[0].id : null; if (activeTournamentId) openTournament(activeTournamentId, false); else resetTournamentView(); }
  renderTournamentDashboard();
}

function resetTournamentView() {
  document.getElementById("currentTournament").textContent = "No tournament created yet"; document.getElementById("totalPlayers").textContent = "0"; document.getElementById("currentFormat").textContent = "—"; document.getElementById("championName").textContent = "🏆"; document.getElementById("tournamentDescription").textContent = "Create your first tournament above."; document.getElementById("tournamentSettings").hidden = true; document.getElementById("playersList").replaceChildren(); document.getElementById("knockoutSection").hidden = true; document.getElementById("competitionSection").hidden = true;
}

document.addEventListener("DOMContent Loaded",() => {
  renderTournamentDashboard();

if(activeTournamentId && tournaments.some(t => t.id===
  activeTournamentId)) {
    openTournament(activeTournamentId, false);
} else if(tournaments.length > 0) {
  activeTournamentId = tournaments[0].id;

  localStorage.setItem("easyFootballActiveTournament",
activeTournamentId);
 openTournament(activeTournamentId,false);
  }
});
