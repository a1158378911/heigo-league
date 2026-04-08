/* ==================== 全局JS ==================== */

// 主题切换
function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeIcon(next);
}

function updateThemeIcon(theme) {
    const darkIcon = document.getElementById('themeIconDark');
    const lightIcon = document.getElementById('themeIconLight');
    if (darkIcon && lightIcon) {
        darkIcon.style.display = theme === 'light' ? 'none' : 'inline';
        lightIcon.style.display = theme === 'light' ? 'inline' : 'none';
    }
}

// 初始化主题
(function() {
    const saved = localStorage.getItem('theme');
    const theme = saved || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcon(theme);
})();

// 实时时钟
function updateClock() {
    const el = document.getElementById('realtime-clock');
    if (!el) return;
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    el.textContent = y + '-' + m + '-' + d + ' ' + h + ':' + min + ':' + s;
}
setInterval(updateClock, 1000);
updateClock();

// 移动端菜单切换
function toggleMobileMenu() {
    const navLinks = document.querySelector('.nav-links');
    navLinks.classList.toggle('active');
}

// 点赞功能
function likeComment(commentId) {
    fetch(`/api/comments/${commentId}/like`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const likeBtn = document.querySelector(`[data-comment-id="${commentId}"]`);
            if (likeBtn) {
                likeBtn.querySelector('.like-count').textContent = data.likes;
                likeBtn.classList.add('liked');
                likeBtn.disabled = true;
            }
        }
    })
    .catch(err => console.error('点赞失败:', err));
}

// 搜索功能（支持中文输入法）
let searchTimeout = null;
let isComposing = false;
const searchInput = document.getElementById('searchInput');
const searchDropdown = document.getElementById('searchDropdown');

if (searchInput) {
    // 中文输入法组合事件处理
    searchInput.addEventListener('compositionstart', function() {
        isComposing = true;
    });

    searchInput.addEventListener('compositionend', function() {
        isComposing = false;
        // 组合结束后触发搜索
        handleSearch(this.value);
    });

    searchInput.addEventListener('input', function() {
        if (!isComposing) {
            handleSearch(this.value);
        }
    });

    function handleSearch(value) {
        clearTimeout(searchTimeout);
        const query = value.trim();

        if (query.length < 1) {
            if (searchDropdown) searchDropdown.classList.remove('active');
            return;
        }

        searchTimeout = setTimeout(() => {
            fetch(`/api/search?q=${encodeURIComponent(query)}`)
                .then(response => response.json())
                .then(data => {
                    if (!searchDropdown) return;
                    if (data.length === 0) {
                        searchDropdown.innerHTML = '<div class="search-dropdown-item"><span class="text-muted">未找到相关教练</span></div>';
                    } else {
                        searchDropdown.innerHTML = data.map(coach => `
                            <a href="/coaches/${coach.id}" class="search-dropdown-item">
                                <div>
                                    <div class="item-name">${escapeHtml(coach.game_id)}</div>
                                    <div class="item-club">${escapeHtml(coach.club_name)} · ${coach.league_level}联赛</div>
                                </div>
                            </a>
                        `).join('');
                    }
                    searchDropdown.classList.add('active');
                })
                .catch(err => console.error('搜索失败:', err));
        }, 300);
    }

    // 点击外部关闭下拉
    document.addEventListener('click', function(e) {
        if (searchInput && searchDropdown && !searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
            searchDropdown.classList.remove('active');
        }
    });
}

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 表单验证
function validateForm(formElement) {
    const requiredFields = formElement.querySelectorAll('[required]');
    let isValid = true;

    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.style.borderColor = 'var(--accent-red)';
            isValid = false;
        } else {
            field.style.borderColor = '';
        }
    });

    return isValid;
}

// 删除确认
function confirmDelete(message) {
    return confirm(message || '确定要删除吗？此操作不可撤销。');
}

// 页面加载动画
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.coach-card, .comment-item, .stat-card').forEach((el, i) => {
        el.style.animationDelay = `${i * 0.05}s`;
        el.classList.add('fade-in');
    });
});
