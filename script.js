function switchTab(name) {
  document.querySelectorAll('.tab').forEach((t, i) => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
  event.currentTarget.classList.add('active');
}

function formatDate(iso) {
  if (!iso) return 'N/A';
  return new Date(iso).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
}

const HEADERS = { 'Accept': 'application/vnd.github.v3+json' };

async function fetchUser(username) {
  let res;
  try {
    res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, { headers: HEADERS });
  } catch (networkErr) {
    throw new Error('Network error — check your internet connection. (' + networkErr.message + ')');
  }
  if (res.status === 404) throw new Error(`User "${username}" not found on GitHub.`);
  if (res.status === 403) {
    const data = await res.json().catch(() => ({}));
    throw new Error('GitHub rate limit reached. Wait a minute and try again. ' + (data.message || ''));
  }
  if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  return res.json();
}

async function fetchRepos(reposUrl) {
  try {
    const url = reposUrl + '?sort=updated&per_page=5';
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

async function fetchAllRepos(reposUrl) {
  try {
    const url = reposUrl + '?per_page=100';
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

function renderProfile(user, repos) {
  const reposHtml = repos.length ? `
    <div class="repos-title">⚡ Latest Repositories</div>
    <div class="repo-list">
      ${repos.map((r, i) => `
        <div class="repo-item" style="animation-delay:${i*0.07}s">
          <div>
            <a class="repo-name" href="${r.html_url}" target="_blank">${r.name}</a>
            <span class="repo-date">Updated ${formatDate(r.updated_at)}</span>
          </div>
          <div class="repo-meta">
            <span class="repo-stars">★ ${r.stargazers_count}</span>
            ${r.language ? `<span>${r.language}</span>` : ''}
          </div>
        </div>
      `).join('')}
    </div>` : '';

  return `
    <div class="profile-card">
      <img class="avatar" src="${user.avatar_url}" alt="${user.login}">
      <div class="profile-info">
        <div class="profile-name">${user.name || user.login}</div>
        <div class="profile-login">@${user.login}</div>
        ${user.bio ? `<div class="profile-bio">"${user.bio}"</div>` : ''}
        <div class="profile-stats">
          <div class="stat"><span class="stat-num">${user.public_repos}</span><span class="stat-label">Repos</span></div>
          <div class="stat"><span class="stat-num">${user.followers}</span><span class="stat-label">Followers</span></div>
          <div class="stat"><span class="stat-num">${user.following}</span><span class="stat-label">Following</span></div>
        </div>
        <div class="profile-meta">
          ${user.location ? `<span>📍 ${user.location}</span>` : ''}
          <span>📅 Joined ${formatDate(user.created_at)}</span>
          ${user.blog ? `<a href="${user.blog.startsWith('http') ? user.blog : 'https://'+user.blog}" target="_blank">🔗 Portfolio</a>` : ''}
          <a href="${user.html_url}" target="_blank">↗ GitHub</a>
        </div>
      </div>
    </div>
    ${reposHtml}
  `;
}

async function doSearch() {
  const username = document.getElementById('searchInput').value.trim();
  if (!username) return;
  const btn = document.getElementById('searchBtn');
  const result = document.getElementById('searchResult');

  btn.disabled = true;
  result.innerHTML = `<div class="status"><span class="loader"></span> Investigating ${username}...</div>`;

  try {
    const user = await fetchUser(username);
    const repos = await fetchRepos(user.repos_url);
    result.innerHTML = renderProfile(user, repos);
  } catch (e) {
    result.innerHTML = `<div class="status error"><span class="big">🚫</span>${e.message || 'Something went wrong'}</div>`;
  } finally {
    btn.disabled = false;
  }
}

async function doBattle() {
  const u1 = document.getElementById('b1Input').value.trim();
  const u2 = document.getElementById('b2Input').value.trim();
  if (!u1 || !u2) { alert('Enter both usernames!'); return; }

  const btn = document.getElementById('battleBtn');
  const result = document.getElementById('battleResult');
  btn.disabled = true;
  result.innerHTML = `<div class="status"><span class="loader"></span> Loading combatants...</div>`;

  try {
    const [user1, user2] = await Promise.all([fetchUser(u1), fetchUser(u2)]);
    const [repos1, repos2] = await Promise.all([fetchAllRepos(user1.repos_url), fetchAllRepos(user2.repos_url)]);

    const stars1 = repos1.reduce((s, r) => s + r.stargazers_count, 0);
    const stars2 = repos2.reduce((s, r) => s + r.stargazers_count, 0);

    // Score: stars + followers
    const score1 = stars1 + user1.followers;
    const score2 = stars2 + user2.followers;
    const draw = score1 === score2;

    const w1 = !draw && score1 > score2;
    const w2 = !draw && score2 > score1;

    function card(user, stars, score, isWin) {
      return `
        <div class="battle-card ${draw ? '' : isWin ? 'winner' : 'loser'}">
          ${!draw ? `<span class="battle-tag ${isWin ? 'win' : 'lose'}">${isWin ? '🏆 WINNER' : '💀 LOSER'}</span>` : ''}
          <img class="battle-avatar" src="${user.avatar_url}" alt="${user.login}">
          <div class="battle-name">${user.name || user.login}</div>
          <div class="battle-login">@${user.login}</div>
          <div class="battle-score">${score.toLocaleString()}</div>
          <div class="battle-score-label">Score (★${stars.toLocaleString()} + ${user.followers} followers)</div>
        </div>`;
    }

    result.innerHTML = `
      <div class="battle-grid">
        ${card(user1, stars1, score1, w1)}
        <div class="battle-vs"><div class="vs-badge">VS</div></div>
        ${card(user2, stars2, score2, w2)}
      </div>
      <div class="verdict">
        <div class="verdict-title">
          ${draw ? "⚖️ It's a Draw!" : `🏆 ${(w1 ? user1.name||user1.login : user2.name||user2.login)} wins!`}
        </div>
        <div class="verdict-sub">
          ${draw ? 'Both developers are equally legendary.' 
            : `Outscored by ${Math.abs(score1-score2).toLocaleString()} points (stars + followers)`}
        </div>
      </div>`;
  } catch(e) {
    result.innerHTML = `<div class="status error"><span class="big">🚫</span>${e.message}</div>`;
  } finally {
    btn.disabled = false;
  }
}

// Enter key support
document.getElementById('searchInput').addEventListener('keydown', e => e.key === 'Enter' && doSearch());
document.getElementById('b1Input').addEventListener('keydown', e => e.key === 'Enter' && doBattle());
document.getElementById('b2Input').addEventListener('keydown', e => e.key === 'Enter' && doBattle());

