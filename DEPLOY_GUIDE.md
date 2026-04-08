# HEIGO 足球经理联机联赛 - 部署指南

## 🚀 快速部署

### 方案一：Railway

**步骤：**
1. 访问 https://railway.app/
2. 登录 → New Project → Deploy from GitHub repo
3. 选择 `heigo-league` 仓库
4. 自动部署

**手动配置（如自动识别失败）：**
- Build Command: `pip install -r requirements.txt`
- Start Command: `gunicorn run:app`

### 方案二：Render

**步骤：**
1. 访问 https://render.com/
2. 登录 → New + → Web Service
3. 连接 GitHub 并选择仓库
4. 自动识别配置

### 方案三：本地运行

```bash
pip install -r requirements.txt
python run.py
```

访问 http://localhost:5000

---

## 🔐 默认管理员

- 用户名：`magic_chicken`
- 密码：`zxcvbnm123`

**⚠️ 首次部署后请立即修改密码！**
