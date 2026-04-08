"""
HEIGO 足球经理联机联赛 - 启动入口
"""
import os
from app import create_app

app = create_app()

if __name__ == '__main__':
    # 支持 Railway/Render 的 PORT 环境变量
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
