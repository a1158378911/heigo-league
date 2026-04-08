// ==================== FM26 联赛管理系统 - 主程序 ====================

// ==================== 页面初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
    initConfig();
    loadTeams();
    loadStandings();
    loadRecentMatches();
    loadSchedule();
    loadTransfers();
    loadAnnouncements();
    
    // 设置默认日期为今天
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('match-date').value = today;
    
    // 初始化比赛类型切换
    toggleMatchFields();
});

// 初始化配置页面
function initConfig() {
    document.getElementById('config-app-id').value = CONFIG.appId || '';
    document.getElementById('config-api-key').value = CONFIG.apiKey || '';
    document.getElementById('config-match-table').value = CONFIG.matchTableId || '';
    document.getElementById('config-team-table').value = CONFIG.teamTableId || '';
    document.getElementById('config-transfer-table').value = CONFIG.transferTableId || '';
    document.getElementById('config-announcement-table').value = CONFIG.announcementTableId || '';
    document.getElementById('config-cup-table').value = CONFIG.cupTableId || '';
}

// 保存配置
function saveConfig() {
    CONFIG.appId = document.getElementById('config-app-id').value.trim();
    CONFIG.apiKey = document.getElementById('config-api-key').value.trim();
    CONFIG.matchTableId = document.getElementById('config-match-table').value.trim();
    CONFIG.teamTableId = document.getElementById('config-team-table').value.trim();
    CONFIG.transferTableId = document.getElementById('config-transfer-table').value.trim();
    CONFIG.announcementTableId = document.getElementById('config-announcement-table').value.trim();
    CONFIG.cupTableId = document.getElementById('config-cup-table').value.trim();
    
    saveConfigToStorage(CONFIG);
    showAlert('配置已保存！', 'success');
}

// 测试连接
async function testConnection() {
    saveConfig();
    await testJdyConnection();
}

// ==================== 页面切换 ====================
function showPage(pageId) {
    // 隐藏所有页面
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // 显示目标页面
    document.getElementById(pageId).classList.add('active');
    
    // 更新导航按钮状态
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // 加载对应数据
    switch(pageId) {
        case 'standings':
            loadStandings();
            break;
        case 'cup-standings':
            loadCupStandings();
            break;
        case 'match-entry':
            loadRecentMatches();
            break;
        case 'schedule':
            loadSchedule();
            break;
        case 'cup-schedule':
            loadCupSchedule();
            break;
        case 'transfer':
            loadTransfers();
            break;
        case 'announcement':
            loadAnnouncements();
            break;
    }
}

// ==================== 显示消息提示 ====================
function showAlert(message, type) {
    const successEl = document.getElementById('alert-success');
    const errorEl = document.getElementById('alert-error');
    
    if (type === 'success') {
        successEl.textContent = message;
        successEl.style.display = 'block';
        setTimeout(() => {
            successEl.style.display = 'none';
        }, 3000);
    } else {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
        setTimeout(() => {
            errorEl.style.display = 'none';
        }, 5000);
    }
}

// ==================== 加载球队列表 ====================
let teams = [];

async function loadTeams() {
    if (!CONFIG.teamTableId) return;
    
    try {
        const result = await searchData(CONFIG.teamTableId);
        if (result && result.entries) {
            teams = result.entries;
            populateTeamSelects();
        }
    } catch (error) {
        console.error('加载球队失败:', error);
    }
}

function populateTeamSelects() {
    const selects = [
        'match-home',
        'match-away',
        'transfer-from',
        'transfer-to'
    ];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">选择球队</option>';
        
        teams.forEach(team => {
            const option = document.createElement('option');
            option.value = team._id;
            option.textContent = team['球队名称'] || team['name'];
            select.appendChild(option);
        });
    });
}

// ==================== 加载积分榜 ====================
async function loadStandings() {
    if (!CONFIG.matchTableId) return;
    
    const loadingEl = document.getElementById('standings-loading');
    const tableEl = document.getElementById('standings-table');
    
    loadingEl.style.display = 'block';
    tableEl.style.display = 'none';
    
    try {
        const result = await searchData(CONFIG.matchTableId, null, 1000);
        
        if (result && result.entries) {
            const standings = calculateStandings(result.entries);
            renderStandings(standings);
            updateStats(standings, result.entries);
        }
        
        loadingEl.style.display = 'none';
        tableEl.style.display = 'table';
    } catch (error) {
        console.error('加载积分榜失败:', error);
        loadingEl.innerHTML = '<p>加载失败，请检查配置</p>';
    }
}

// 计算积分榜
function calculateStandings(matches) {
    const teamStats = {};
    
    // 初始化所有球队
    teams.forEach(team => {
        const teamName = team['球队名称'] || team['name'];
        teamStats[teamName] = {
            name: teamName,
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            goalDifference: 0,
            points: 0
        };
    });
    
    // 统计比赛数据（只统计已确认的比赛）
    matches.forEach(match => {
        const status = match['状态'] || '';
        if (status !== '已确认' && status !== '已结束') return;
        
        const homeTeam = match['主队'];
        const awayTeam = match['客队'];
        const homeScore = parseInt(match['主队得分'] || 0);
        const awayScore = parseInt(match['客队得分'] || 0);
        
        if (!homeTeam || !awayTeam) return;
        
        // 初始化球队统计
        if (!teamStats[homeTeam]) {
            teamStats[homeTeam] = {
                name: homeTeam, played: 0, won: 0, drawn: 0, lost: 0,
                goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0
            };
        }
        if (!teamStats[awayTeam]) {
            teamStats[awayTeam] = {
                name: awayTeam, played: 0, won: 0, drawn: 0, lost: 0,
                goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0
            };
        }
        
        // 更新统计
        teamStats[homeTeam].played++;
        teamStats[awayTeam].played++;
        teamStats[homeTeam].goalsFor += homeScore;
        teamStats[homeTeam].goalsAgainst += awayScore;
        teamStats[awayTeam].goalsFor += awayScore;
        teamStats[awayTeam].goalsAgainst += homeScore;
        
        // 判断胜负
        if (homeScore > awayScore) {
            teamStats[homeTeam].won++;
            teamStats[homeTeam].points += 3;
            teamStats[awayTeam].lost++;
        } else if (homeScore < awayScore) {
            teamStats[awayTeam].won++;
            teamStats[awayTeam].points += 3;
            teamStats[homeTeam].lost++;
        } else {
            teamStats[homeTeam].drawn++;
            teamStats[homeTeam].points += 1;
            teamStats[awayTeam].drawn++;
            teamStats[awayTeam].points += 1;
        }
    });
    
    // 计算净胜球并排序
    Object.values(teamStats).forEach(team => {
        team.goalDifference = team.goalsFor - team.goalsAgainst;
    });
    
    const standings = Object.values(teamStats).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        return b.goalsFor - a.goalsFor;
    });
    
    // 添加排名
    standings.forEach((team, index) => {
        team.position = index + 1;
    });
    
    return standings;
}

// 渲染积分榜
function renderStandings(standings) {
    const tbody = document.getElementById('standings-body');
    tbody.innerHTML = '';
    
    standings.forEach(team => {
        const tr = document.createElement('tr');
        
        let rankClass = '';
        if (team.position === 1) rankClass = 'rank-1';
        else if (team.position === 2) rankClass = 'rank-2';
        else if (team.position === 3) rankClass = 'rank-3';
        
        tr.innerHTML = `
            <td class="${rankClass}"><strong>${team.position}</strong></td>
            <td>${team.name}</td>
            <td>${team.played}</td>
            <td>${team.won}</td>
            <td>${team.drawn}</td>
            <td>${team.lost}</td>
            <td>${team.goalsFor}</td>
            <td>${team.goalsAgainst}</td>
            <td>${team.goalDifference > 0 ? '+' : ''}${team.goalDifference}</td>
            <td><strong>${team.points}</strong></td>
        `;
        
        tbody.appendChild(tr);
    });
}

// 更新统计数据
function updateStats(standings, matches) {
    document.getElementById('stat-teams').textContent = standings.length;
    
    const confirmedMatches = matches.filter(m => 
        m['状态'] === '已确认' || m['状态'] === '已结束'
    ).length;
    document.getElementById('stat-matches').textContent = confirmedMatches;
    
    const totalGoals = matches.reduce((sum, m) => {
        return sum + (parseInt(m['主队得分'] || 0) + parseInt(m['客队得分'] || 0));
    }, 0);
    document.getElementById('stat-goals').textContent = totalGoals;
}

// ==================== 加载杯赛积分榜 ====================
async function loadCupStandings() {
    if (!CONFIG.cupTableId) {
        document.getElementById('cup-standings-loading').innerHTML = '<p>请先在设置页面配置杯赛记录表 ID</p>';
        return;
    }
    
    const loadingEl = document.getElementById('cup-standings-loading');
    const tableEl = document.getElementById('cup-standings-table');
    
    loadingEl.style.display = 'block';
    tableEl.style.display = 'none';
    
    try {
        const result = await searchData(CONFIG.cupTableId, null, 1000);
        
        if (result && result.entries) {
            const filterGroup = document.getElementById('cup-group-filter').value;
            const cupStandings = calculateCupStandings(result.entries, filterGroup);
            renderCupStandings(cupStandings);
            updateCupStats(cupStandings, result.entries);
        }
        
        loadingEl.style.display = 'none';
        tableEl.style.display = 'table';
    } catch (error) {
        console.error('加载杯赛积分榜失败:', error);
        loadingEl.innerHTML = '<p>加载失败，请检查配置</p>';
    }
}

// 计算杯赛积分榜
function calculateCupStandings(matches, filterGroup) {
    const teamStats = {};
    
    // 统计比赛数据
    matches.forEach(match => {
        const status = match['状态'] || '';
        if (status !== '已确认' && status !== '已结束') return;
        
        // 组别筛选
        if (filterGroup && match['组别'] !== filterGroup && filterGroup !== '淘汰赛') {
            if (match['阶段'] !== '小组赛') return;
        }
        
        const homeTeam = match['主队'];
        const awayTeam = match['客队'];
        const homeScore = parseInt(match['主队得分'] || 0);
        const awayScore = parseInt(match['客队得分'] || 0);
        const group = match['组别'] || '-';
        
        if (!homeTeam || !awayTeam) return;
        
        // 初始化球队统计
        if (!teamStats[homeTeam]) {
            teamStats[homeTeam] = {
                name: homeTeam, group, played: 0, won: 0, drawn: 0, lost: 0,
                goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0
            };
        }
        if (!teamStats[awayTeam]) {
            teamStats[awayTeam] = {
                name: awayTeam, group, played: 0, won: 0, drawn: 0, lost: 0,
                goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0
            };
        }
        
        // 更新统计
        teamStats[homeTeam].played++;
        teamStats[awayTeam].played++;
        teamStats[homeTeam].goalsFor += homeScore;
        teamStats[homeTeam].goalsAgainst += awayScore;
        teamStats[awayTeam].goalsFor += awayScore;
        teamStats[awayTeam].goalsAgainst += homeScore;
        
        // 判断胜负
        if (homeScore > awayScore) {
            teamStats[homeTeam].won++;
            teamStats[homeTeam].points += 3;
            teamStats[awayTeam].lost++;
        } else if (homeScore < awayScore) {
            teamStats[awayTeam].won++;
            teamStats[awayTeam].points += 3;
            teamStats[homeTeam].lost++;
        } else {
            teamStats[homeTeam].drawn++;
            teamStats[homeTeam].points += 1;
            teamStats[awayTeam].drawn++;
            teamStats[awayTeam].points += 1;
        }
    });
    
    // 计算净胜球并排序
    Object.values(teamStats).forEach(team => {
        team.goalDifference = team.goalsFor - team.goalsAgainst;
    });
    
    const standings = Object.values(teamStats).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        return b.goalsFor - a.goalsFor;
    });
    
    // 添加排名
    standings.forEach((team, index) => {
        team.position = index + 1;
    });
    
    return standings;
}

// 渲染杯赛积分榜
function renderCupStandings(standings) {
    const tbody = document.getElementById('cup-standings-body');
    tbody.innerHTML = '';
    
    standings.forEach(team => {
        const tr = document.createElement('tr');
        
        let rankClass = '';
        if (team.position === 1) rankClass = 'rank-1';
        else if (team.position === 2) rankClass = 'rank-2';
        else if (team.position === 3) rankClass = 'rank-3';
        
        tr.innerHTML = `
            <td class="${rankClass}"><strong>${team.position}</strong></td>
            <td>${team.name}</td>
            <td>${team.group}</td>
            <td>${team.played}</td>
            <td>${team.won}</td>
            <td>${team.drawn}</td>
            <td>${team.lost}</td>
            <td>${team.goalsFor}</td>
            <td>${team.goalsAgainst}</td>
            <td>${team.goalDifference > 0 ? '+' : ''}${team.goalDifference}</td>
            <td><strong>${team.points}</strong></td>
        `;
        
        tbody.appendChild(tr);
    });
}

// 更新杯赛统计数据
function updateCupStats(standings, matches) {
    document.getElementById('cup-stat-teams').textContent = standings.length;
    
    const confirmedMatches = matches.filter(m => 
        (m['状态'] === '已确认' || m['状态'] === '已结束')
    ).length;
    document.getElementById('cup-stat-matches').textContent = confirmedMatches;
    
    const totalGoals = matches.reduce((sum, m) => {
        return sum + (parseInt(m['主队得分'] || 0) + parseInt(m['客队得分'] || 0));
    }, 0);
    document.getElementById('cup-stat-goals').textContent = totalGoals;
}

// ==================== 加载杯赛赛程 ====================
async function loadCupSchedule() {
    if (!CONFIG.cupTableId) {
        document.getElementById('cup-schedule-loading').innerHTML = '<p>请先在设置页面配置杯赛记录表 ID</p>';
        return;
    }
    
    const loadingEl = document.getElementById('cup-schedule-loading');
    const tableEl = document.getElementById('cup-schedule-table');
    
    loadingEl.style.display = 'block';
    tableEl.style.display = 'none';
    
    try {
        const result = await searchData(CONFIG.cupTableId, null, 500);
        
        if (result && result.entries) {
            const matches = result.entries.sort((a, b) => {
                const stageOrder = {'小组赛': 1, '16 强': 2, '8 强': 3, '4 强': 4, '决赛': 5};
                return (stageOrder[a['阶段']] || 0) - (stageOrder[b['阶段']] || 0);
            });
            renderCupSchedule(matches);
        }
        
        loadingEl.style.display = 'none';
        tableEl.style.display = 'table';
    } catch (error) {
        console.error('加载杯赛赛程失败:', error);
    }
}

function renderCupSchedule(matches) {
    const filterStage = document.getElementById('cup-schedule-stage-filter').value;
    const tbody = document.getElementById('cup-schedule-body');
    tbody.innerHTML = '';
    
    const filtered = filterStage 
        ? matches.filter(m => m['阶段'] === filterStage)
        : matches;
    
    filtered.forEach(match => {
        const tr = document.createElement('tr');
        const status = match['状态'] || '未开始';
        const score = (match['主队得分'] !== undefined && match['客队得分'] !== undefined)
            ? `${match['主队得分']} - ${match['客队得分']}`
            : 'vs';
        
        tr.innerHTML = `
            <td>${match['阶段'] || '-'}</td>
            <td>${match['组别'] || '-'}</td>
            <td>${match['比赛日期'] || '-'}</td>
            <td>${match['主队'] || '-'}</td>
            <td><strong>${score}</strong></td>
            <td>${match['客队'] || '-'}</td>
            <td><span class="badge badge-${status === '已确认' ? 'confirmed' : 'pending'}">${status}</span></td>
        `;
        
        tbody.appendChild(tr);
    });
}

// 切换比赛类型字段
function toggleMatchFields() {
    const matchType = document.getElementById('match-type').value;
    const leagueRoundGroup = document.getElementById('league-round-group');
    const cupStageGroup = document.getElementById('cup-stage-group');
    const cupGroupGroup = document.getElementById('cup-group-group');
    
    if (matchType === 'cup') {
        leagueRoundGroup.style.display = 'none';
        cupStageGroup.style.display = 'block';
        cupGroupGroup.style.display = 'block';
        document.getElementById('match-round').required = false;
    } else {
        leagueRoundGroup.style.display = 'block';
        cupStageGroup.style.display = 'none';
        cupGroupGroup.style.display = 'none';
        document.getElementById('match-round').required = true;
    }
}

// ==================== 提交比赛结果 ====================
async function submitMatch(event) {
    event.preventDefault();
    
    const matchType = document.getElementById('match-type').value;
    
    if (matchType === 'league') {
        // 联赛比赛
        if (!CONFIG.matchTableId) {
            showAlert('请先在设置页面配置比赛记录表 ID', 'error');
            return;
        }
        
        const round = document.getElementById('match-round').value;
        const homeTeamId = document.getElementById('match-home').value;
        const awayTeamId = document.getElementById('match-away').value;
        const homeScore = document.getElementById('match-home-score').value;
        const awayScore = document.getElementById('match-away-score').value;
        const matchDate = document.getElementById('match-date').value;
        const note = document.getElementById('match-note').value;
        
        // 获取球队名称
        const homeTeam = teams.find(t => t._id === homeTeamId);
        const awayTeam = teams.find(t => t._id === awayTeamId);
        
        if (!homeTeam || !awayTeam) {
            showAlert('请选择主队和客队', 'error');
            return;
        }
        
        const homeName = homeTeam['球队名称'] || homeTeam['name'];
        const awayName = awayTeam['球队名称'] || awayTeam['name'];
        
        const data = {
            '轮次': parseInt(round),
            '主队': homeName,
            '客队': awayName,
            '主队得分': parseInt(homeScore),
            '客队得分': parseInt(awayScore),
            '比赛日期': matchDate,
            '状态': '已确认',
            '数据来源': '人工录入',
            '录入人': '网页录入',
            '备注': note,
        };
        
        const result = await createData(CONFIG.matchTableId, data);
        
        if (result) {
            showAlert('比赛结果提交成功！', 'success');
            document.getElementById('match-form').reset();
            document.getElementById('match-date').value = new Date().toISOString().split('T')[0];
            document.getElementById('match-type').value = 'league';
            toggleMatchFields();
            
            // 刷新数据
            loadStandings();
            loadRecentMatches();
            loadSchedule();
        }
    } else {
        // 杯赛比赛
        if (!CONFIG.cupTableId) {
            showAlert('请先在设置页面配置杯赛记录表 ID', 'error');
            return;
        }
        
        const stage = document.getElementById('match-stage').value;
        const group = document.getElementById('match-group').value;
        const homeTeamId = document.getElementById('match-home').value;
        const awayTeamId = document.getElementById('match-away').value;
        const homeScore = document.getElementById('match-home-score').value;
        const awayScore = document.getElementById('match-away-score').value;
        const matchDate = document.getElementById('match-date').value;
        const note = document.getElementById('match-note').value;
        
        if (!stage) {
            showAlert('请选择杯赛阶段', 'error');
            return;
        }
        
        // 获取球队名称
        const homeTeam = teams.find(t => t._id === homeTeamId);
        const awayTeam = teams.find(t => t._id === awayTeamId);
        
        if (!homeTeam || !awayTeam) {
            showAlert('请选择主队和客队', 'error');
            return;
        }
        
        const homeName = homeTeam['球队名称'] || homeTeam['name'];
        const awayName = awayTeam['球队名称'] || awayTeam['name'];
        
        const data = {
            '阶段': stage,
            '组别': group,
            '主队': homeName,
            '客队': awayName,
            '主队得分': parseInt(homeScore),
            '客队得分': parseInt(awayScore),
            '比赛日期': matchDate,
            '状态': '已确认',
            '数据来源': '人工录入',
            '录入人': '网页录入',
            '备注': note,
        };
        
        const result = await createData(CONFIG.cupTableId, data);
        
        if (result) {
            showAlert('杯赛结果提交成功！', 'success');
            document.getElementById('match-form').reset();
            document.getElementById('match-date').value = new Date().toISOString().split('T')[0];
            document.getElementById('match-type').value = 'league';
            toggleMatchFields();
            
            // 刷新数据
            loadCupStandings();
            loadCupSchedule();
        }
    }
}

// ==================== 加载最近比赛 ====================
async function loadRecentMatches() {
    if (!CONFIG.matchTableId) return;
    
    const loadingEl = document.getElementById('recent-matches-loading');
    const tableEl = document.getElementById('recent-matches-table');
    
    loadingEl.style.display = 'block';
    tableEl.style.display = 'none';
    
    try {
        const result = await searchData(CONFIG.matchTableId, null, 20);
        
        if (result && result.entries) {
            const matches = result.entries.sort((a, b) => {
                return new Date(b['比赛日期'] || 0) - new Date(a['比赛日期'] || 0);
            });
            renderRecentMatches(matches);
        }
        
        loadingEl.style.display = 'none';
        tableEl.style.display = 'table';
    } catch (error) {
        console.error('加载最近比赛失败:', error);
    }
}

function renderRecentMatches(matches) {
    const tbody = document.getElementById('recent-matches-body');
    tbody.innerHTML = '';
    
    matches.slice(0, 10).forEach(match => {
        const tr = document.createElement('tr');
        const sourceBadge = match['数据来源'] === '论坛爬虫' 
            ? '<span class="badge badge-crawler">爬虫</span>'
            : '<span class="badge badge-manual">手动</span>';
        
        tr.innerHTML = `
            <td>${match['轮次'] || '-'}</td>
            <td>${match['主队']} vs ${match['客队']}</td>
            <td><strong>${match['主队得分'] || 0} - ${match['客队得分'] || 0}</strong></td>
            <td>${match['比赛日期'] || '-'}</td>
            <td>${sourceBadge}</td>
        `;
        
        tbody.appendChild(tr);
    });
}

// ==================== 加载赛程 ====================
async function loadSchedule() {
    if (!CONFIG.matchTableId) return;
    
    const loadingEl = document.getElementById('schedule-loading');
    const tableEl = document.getElementById('schedule-table');
    
    loadingEl.style.display = 'block';
    tableEl.style.display = 'none';
    
    try {
        const result = await searchData(CONFIG.matchTableId, null, 500);
        
        if (result && result.entries) {
            const matches = result.entries.sort((a, b) => {
                return (a['轮次'] || 0) - (b['轮次'] || 0);
            });
            renderSchedule(matches);
            populateRoundFilter(matches);
        }
        
        loadingEl.style.display = 'none';
        tableEl.style.display = 'table';
    } catch (error) {
        console.error('加载赛程失败:', error);
    }
}

function populateRoundFilter(matches) {
    const select = document.getElementById('schedule-round-filter');
    const rounds = [...new Set(matches.map(m => m['轮次']))].sort((a, b) => a - b);
    
    select.innerHTML = '<option value="">全部轮次</option>';
    rounds.forEach(round => {
        if (round) {
            const option = document.createElement('option');
            option.value = round;
            option.textContent = `第${round}轮`;
            select.appendChild(option);
        }
    });
}

function filterSchedule() {
    loadSchedule();
}

function renderSchedule(matches) {
    const filterRound = document.getElementById('schedule-round-filter').value;
    const tbody = document.getElementById('schedule-body');
    tbody.innerHTML = '';
    
    const filtered = filterRound 
        ? matches.filter(m => m['轮次'] == filterRound)
        : matches;
    
    filtered.forEach(match => {
        const tr = document.createElement('tr');
        const status = match['状态'] || '未开始';
        const score = (match['主队得分'] !== undefined && match['客队得分'] !== undefined)
            ? `${match['主队得分']} - ${match['客队得分']}`
            : 'vs';
        
        tr.innerHTML = `
            <td>第${match['轮次'] || '-'}轮</td>
            <td>${match['比赛日期'] || '-'}</td>
            <td>${match['主队'] || '-'}</td>
            <td><strong>${score}</strong></td>
            <td>${match['客队'] || '-'}</td>
            <td><span class="badge badge-${status === '已确认' ? 'confirmed' : 'pending'}">${status}</span></td>
        `;
        
        tbody.appendChild(tr);
    });
}

// ==================== 提交交易申请 ====================
async function submitTransfer(event) {
    event.preventDefault();
    
    if (!CONFIG.transferTableId) {
        showAlert('请先在设置页面配置交易记录表 ID', 'error');
        return;
    }
    
    const player = document.getElementById('transfer-player').value;
    const position = document.getElementById('transfer-position').value;
    const fromTeamId = document.getElementById('transfer-from').value;
    const toTeamId = document.getElementById('transfer-to').value;
    const type = document.getElementById('transfer-type').value;
    const amount = document.getElementById('transfer-amount').value;
    
    const fromTeam = teams.find(t => t._id === fromTeamId);
    const toTeam = teams.find(t => t._id === toTeamId);
    
    if (!fromTeam || !toTeam) {
        showAlert('请选择转出和转入球队', 'error');
        return;
    }
    
    const data = {
        '球员姓名': player,
        '位置': position,
        '转出球队': fromTeam['球队名称'] || fromTeam['name'],
        '转入球队': toTeam['球队名称'] || toTeam['name'],
        '交易类型': type,
        '交易金额': amount ? parseFloat(amount) : null,
        '提交日期': new Date().toISOString(),
        '状态': '待审核',
    };
    
    const result = await createData(CONFIG.transferTableId, data);
    
    if (result) {
        showAlert('交易申请提交成功！等待管理员审核', 'success');
        document.getElementById('transfer-form').reset();
        loadTransfers();
    }
}

// ==================== 加载交易记录 ====================
async function loadTransfers() {
    if (!CONFIG.transferTableId) return;
    
    const loadingEl = document.getElementById('transfers-loading');
    const tableEl = document.getElementById('transfers-table');
    
    loadingEl.style.display = 'block';
    tableEl.style.display = 'none';
    
    try {
        const result = await searchData(CONFIG.transferTableId, null, 50);
        
        if (result && result.entries) {
            const transfers = result.entries.sort((a, b) => {
                return new Date(b['提交日期'] || 0) - new Date(a['提交日期'] || 0);
            });
            renderTransfers(transfers);
        }
        
        loadingEl.style.display = 'none';
        tableEl.style.display = 'table';
    } catch (error) {
        console.error('加载交易记录失败:', error);
    }
}

function renderTransfers(transfers) {
    const tbody = document.getElementById('transfers-body');
    tbody.innerHTML = '';
    
    transfers.slice(0, 20).forEach(transfer => {
        const tr = document.createElement('tr');
        const status = transfer['状态'] || '待审核';
        
        tr.innerHTML = `
            <td>${transfer['球员姓名'] || '-'}</td>
            <td>${transfer['转出球队'] || '-'}</td>
            <td>${transfer['转入球队'] || '-'}</td>
            <td>${transfer['交易类型'] || '-'}</td>
            <td><span class="badge badge-${status === '已通过' ? 'confirmed' : 'pending'}">${status}</span></td>
        `;
        
        tbody.appendChild(tr);
    });
}

// ==================== 加载公告 ====================
async function loadAnnouncements() {
    if (!CONFIG.announcementTableId) {
        document.getElementById('announcements-loading').style.display = 'none';
        document.getElementById('announcements-list').innerHTML = '<p>暂无公告</p>';
        return;
    }
    
    const loadingEl = document.getElementById('announcements-loading');
    const listEl = document.getElementById('announcements-list');
    
    loadingEl.style.display = 'block';
    listEl.innerHTML = '';
    
    try {
        const result = await searchData(CONFIG.announcementTableId, null, 20);
        
        if (result && result.entries) {
            const announcements = result.entries.sort((a, b) => {
                return new Date(b['发布日期'] || 0) - new Date(a['发布日期'] || 0);
            });
            renderAnnouncements(announcements);
        } else {
            listEl.innerHTML = '<p>暂无公告</p>';
        }
        
        loadingEl.style.display = 'none';
    } catch (error) {
        console.error('加载公告失败:', error);
        loadingEl.style.display = 'none';
        listEl.innerHTML = '<p>加载失败</p>';
    }
}

function renderAnnouncements(announcements) {
    const listEl = document.getElementById('announcements-list');
    listEl.innerHTML = '';
    
    announcements.forEach(ann => {
        const div = document.createElement('div');
        div.style.cssText = 'background: var(--bg-secondary); padding: 1rem; border-radius: 5px; margin-bottom: 1rem; border-left: 4px solid var(--accent);';
        
        const priority = ann['优先级'] || '普通';
        const priorityColor = priority === '紧急' ? '#e94560' : priority === '重要' ? '#ffc107' : '#a0a0a0';
        
        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <h3 style="color: var(--text-primary);">${ann['标题'] || '无标题'}</h3>
                <span style="color: ${priorityColor}; font-size: 0.8rem;">${priority}</span>
            </div>
            <p style="color: var(--text-secondary); margin-bottom: 0.5rem;">${ann['内容'] || ''}</p>
            <div style="font-size: 0.8rem; color: var(--text-secondary);">
                发布：${ann['发布人'] || '管理员'} | ${ann['发布日期'] ? new Date(ann['发布日期']).toLocaleDateString('zh-CN') : '-'}
            </div>
        `;
        
        listEl.appendChild(div);
    });
}
