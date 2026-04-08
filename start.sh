#!/bin/bash
# HEIGO足球经理联机联赛 - 启动脚本
echo "⚽ 正在启动 HEIGO足球经理联机联赛网站..."
echo "========================================"
echo ""

cd "$(dirname "$0")"

# 检查Python环境
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误: 未找到Python3，请先安装Python3"
    exit 1
fi

# 检查依赖
echo "📦 检查依赖..."
pip install flask flask-sqlalchemy flask-login werkzeug --break-system-packages --quiet 2>/dev/null

echo ""
echo "✅ 启动成功！"
echo ""
echo "========================================"
echo "  🌐 网站地址: http://localhost:5000"
echo "  🔐 管理后台: http://localhost:5000/admin/login"
echo "  👤 管理账号: admin"
echo "  🔑 管理密码: admin123"
echo "========================================"
echo ""
echo "按 Ctrl+C 停止服务器"
echo ""

python3 run.py
