"""
HEIGO足球经理联机联赛 - 路由
"""
import os
import uuid
from flask import (
    Blueprint, render_template, request, redirect, url_for,
    jsonify, flash, current_app
)
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename
from app import db
from app.models import Admin, Coach, Comment, RATING_ORDER

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

main_bp = Blueprint('main', __name__)
admin_bp = Blueprint('admin', __name__)


# ==================== 前台路由 ====================

@main_bp.route('/')
def index():
    """首页"""
    levels = ['超级', '甲级', '乙级']
    level_labels = {'超级': '超级联赛', '甲级': '甲级联赛', '乙级': '乙级联赛'}
    league_data = {}
    for level in levels:
        coaches = Coach.query.filter_by(league_level=level).all()
        # 按评级权重降序排列
        coaches = sorted(coaches, key=lambda c: c.rating_weight, reverse=True)
        league_data[level] = {
            'label': level_labels[level],
            'coaches': coaches
        }
    total_coaches = Coach.query.count()
    total_comments = Comment.query.count()

    # 评级榜：按评级权重降序取前10
    all_coaches = Coach.query.all()
    rating_board = sorted(all_coaches, key=lambda c: c.rating_weight, reverse=True)[:10]

    # 冠军排行榜：按冠军数量降序取前10
    honor_board = sorted(
        [c for c in all_coaches if c.honor_count > 0],
        key=lambda c: c.honor_count,
        reverse=True
    )[:10]
    # 如果不足10人，补充无冠军的教练
    if len(honor_board) < 10:
        remaining = sorted(
            [c for c in all_coaches if c.honor_count == 0],
            key=lambda c: c.rating_weight,
            reverse=True
        )
        honor_board.extend(remaining[:10 - len(honor_board)])

    return render_template('index.html',
                           league_data=league_data,
                           total_coaches=total_coaches,
                           total_comments=total_comments,
                           rating_board=rating_board,
                           honor_board=honor_board)


@main_bp.route('/coaches')
def coach_list():
    """教练列表页"""
    level = request.args.get('level', '')
    search = request.args.get('search', '').strip()
    sort = request.args.get('sort', 'rating')

    query = Coach.query

    if level:
        query = query.filter(Coach.league_level == level)
    if search:
        query = query.filter(
            db.or_(
                Coach.game_id.contains(search),
                Coach.club_name.contains(search),
                Coach.forum_id.contains(search),
            )
        )

    if sort == 'rating':
        coaches = query.all()
        coaches = sorted(coaches, key=lambda c: c.rating_weight, reverse=True)
    elif sort == 'name':
        query = query.order_by(Coach.game_id.asc())
        coaches = query.all()
    elif sort == 'likes':
        coaches = query.all()
        coaches = sorted(coaches, key=lambda c: c.total_likes, reverse=True)
    elif sort == 'honors':
        coaches = query.all()
        coaches = sorted(coaches, key=lambda c: c.honor_count, reverse=True)
    else:
        coaches = query.all()
        coaches = sorted(coaches, key=lambda c: c.rating_weight, reverse=True)

    return render_template('coaches.html',
                           coaches=coaches,
                           current_level=level,
                           current_search=search,
                           current_sort=sort)


@main_bp.route('/coaches/<int:coach_id>')
def coach_detail(coach_id):
    """教练详情页"""
    coach = Coach.query.get_or_404(coach_id)
    comments = coach.comments.all()
    return render_template('coach_detail.html', coach=coach, comments=comments)


@main_bp.route('/api/coaches/<int:coach_id>/comment', methods=['POST'])
def add_comment(coach_id):
    """添加评论"""
    coach = Coach.query.get_or_404(coach_id)
    author_name = request.form.get('author_name', '').strip()
    content = request.form.get('content', '').strip()

    if not author_name or not content:
        flash('请填写昵称和评论内容', 'error')
        return redirect(url_for('main.coach_detail', coach_id=coach_id))

    comment = Comment(
        coach_id=coach_id,
        author_name=author_name,
        content=content
    )
    db.session.add(comment)
    db.session.commit()
    flash('评论发布成功！', 'success')
    return redirect(url_for('main.coach_detail', coach_id=coach_id))


@main_bp.route('/api/comments/<int:comment_id>/like', methods=['POST'])
def like_comment(comment_id):
    """点赞评论"""
    comment = Comment.query.get_or_404(comment_id)
    comment.likes += 1
    db.session.commit()
    return jsonify({'success': True, 'likes': comment.likes})


@main_bp.route('/api/search')
def search_coaches():
    """搜索教练API"""
    keyword = request.args.get('q', '').strip()
    if not keyword:
        return jsonify([])

    coaches = Coach.query.filter(
        db.or_(
            Coach.game_id.contains(keyword),
            Coach.club_name.contains(keyword),
            Coach.forum_id.contains(keyword),
        )
    ).limit(10).all()

    return jsonify([c.to_dict() for c in coaches])


# ==================== 管理员路由 ====================

@admin_bp.route('/login', methods=['GET', 'POST'])
def admin_login():
    """管理员登录"""
    if request.method == 'POST':
        username = request.form.get('username', '')
        password = request.form.get('password', '')
        admin = Admin.query.filter_by(username=username).first()

        if admin and check_password_hash(admin.password_hash, password):
            login_user(admin)
            flash('登录成功！', 'success')
            return redirect(url_for('admin.dashboard'))
        else:
            flash('用户名或密码错误', 'error')

    return render_template('admin/login.html')


@admin_bp.route('/logout')
@login_required
def admin_logout():
    """管理员登出"""
    logout_user()
    return redirect(url_for('main.index'))


@admin_bp.route('/dashboard')
@login_required
def dashboard():
    """管理面板首页"""
    coaches = Coach.query.order_by(Coach.created_at.desc()).all()
    level_stats = {}
    for level in ['超级', '甲级', '乙级']:
        count = Coach.query.filter_by(league_level=level).count()
        level_stats[level] = count
    return render_template('admin/dashboard.html',
                           coaches=coaches,
                           level_stats=level_stats)


@admin_bp.route('/upload/avatar', methods=['POST'])
@login_required
def upload_avatar():
    """上传教练头像"""
    if 'avatar' not in request.files:
        return jsonify({'success': False, 'error': '没有选择文件'}), 400

    file = request.files['avatar']
    if file.filename == '':
        return jsonify({'success': False, 'error': '没有选择文件'}), 400

    if not allowed_file(file.filename):
        return jsonify({'success': False, 'error': '不支持的文件格式，请上传 png/jpg/gif/webp'}), 400

    # 生成唯一文件名
    ext = file.filename.rsplit('.', 1)[1].lower()
    filename = str(uuid.uuid4())[:8] + '.' + ext
    upload_dir = os.path.join(current_app.root_path, 'static', 'uploads', 'avatars')
    os.makedirs(upload_dir, exist_ok=True)
    filepath = os.path.join(upload_dir, filename)
    file.save(filepath)

    # 返回可访问的URL路径
    avatar_url = f'/static/uploads/avatars/{filename}'
    return jsonify({'success': True, 'url': avatar_url})


@admin_bp.route('/coaches/create', methods=['GET', 'POST'])
@login_required
def create_coach():
    """创建教练"""
    if request.method == 'POST':
        coach = Coach(
            game_id=request.form.get('game_id', ''),
            club_name=request.form.get('club_name', ''),
            league_level=request.form.get('league_level', '甲级'),
            join_date=request.form.get('join_date', ''),
            forum_id=request.form.get('forum_id', ''),
            career=request.form.get('career', ''),
            rating=request.form.get('rating', 'C'),
            stars=int(request.form.get('stars', 1)),
            honors=request.form.get('honors', ''),
            avatar=request.form.get('avatar_url', ''),
            motto=request.form.get('motto', ''),
        )
        db.session.add(coach)
        db.session.commit()
        flash('教练信息创建成功！', 'success')
        return redirect(url_for('admin.dashboard'))

    return render_template('admin/coach_form.html', coach=None)


@admin_bp.route('/coaches/<int:coach_id>/edit', methods=['GET', 'POST'])
@login_required
def edit_coach(coach_id):
    """编辑教练"""
    coach = Coach.query.get_or_404(coach_id)

    if request.method == 'POST':
        coach.game_id = request.form.get('game_id', '')
        coach.club_name = request.form.get('club_name', '')
        coach.league_level = request.form.get('league_level', '甲级')
        coach.join_date = request.form.get('join_date', '')
        coach.forum_id = request.form.get('forum_id', '')
        coach.career = request.form.get('career', '')
        coach.rating = request.form.get('rating', 'C')
        coach.stars = int(request.form.get('stars', 1))
        coach.honors = request.form.get('honors', '')
        coach.avatar = request.form.get('avatar_url', '')
        coach.motto = request.form.get('motto', '')
        db.session.commit()
        flash('教练信息更新成功！', 'success')
        return redirect(url_for('admin.dashboard'))

    return render_template('admin/coach_form.html', coach=coach)


@admin_bp.route('/coaches/<int:coach_id>/delete', methods=['POST'])
@login_required
def delete_coach(coach_id):
    """删除教练"""
    coach = Coach.query.get_or_404(coach_id)
    Comment.query.filter_by(coach_id=coach_id).delete()
    db.session.delete(coach)
    db.session.commit()
    flash('教练信息已删除', 'success')
    return redirect(url_for('admin.dashboard'))


@admin_bp.route('/comments/<int:comment_id>/delete', methods=['POST'])
@login_required
def delete_comment(comment_id):
    """删除评论"""
    comment = Comment.query.get_or_404(comment_id)
    coach_id = comment.coach_id
    db.session.delete(comment)
    db.session.commit()
    flash('评论已删除', 'success')
    return redirect(url_for('main.coach_detail', coach_id=coach_id))
