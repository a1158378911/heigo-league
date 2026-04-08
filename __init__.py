"""
HEIGO 足球经理联机联赛 - 主应用
"""
import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from werkzeug.security import generate_password_hash

db = SQLAlchemy()
login_manager = LoginManager()
login_manager.login_view = 'admin.admin_login'

def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'heigo-fm-league-2024-secret')
    
    # 支持 Railway/Render 的 DATABASE_URL 环境变量
    database_url = os.environ.get('DATABASE_URL')
    if database_url:
        # 如果是 PostgreSQL URL，保持原样
        if database_url.startswith('postgresql://'):
            app.config['SQLALCHEMY_DATABASE_URI'] = database_url
        else:
            app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    else:
        # 默认使用 SQLite
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///heigo_league.db'
    
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)
    login_manager.init_app(app)

    from .models import Admin, Coach, Comment
    from .routes import main_bp, admin_bp

    @login_manager.user_loader
    def load_user(user_id):
        return Admin.query.get(int(user_id))

    app.register_blueprint(main_bp)
    app.register_blueprint(admin_bp, url_prefix='/admin')

    with app.app_context():
        db.create_all()
        # 创建默认管理员账号
        if not Admin.query.filter_by(username='magic_chicken').first():
            admin = Admin(
                username='magic_chicken',
                password_hash=generate_password_hash('zxcvbnm123')
            )
            db.session.add(admin)
            db.session.commit()

    return app
