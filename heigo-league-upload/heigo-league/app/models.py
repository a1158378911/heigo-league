"""
HEIGO足球经理联机联赛 - 数据模型
"""
from datetime import datetime
from app import db
from flask_login import UserMixin

# 评级排序权重
RATING_ORDER = {'S': 4, 'A': 3, 'B': 2, 'C': 1}


class Admin(UserMixin, db.Model):
    """管理员模型"""
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)


class Coach(db.Model):
    """教练模型"""
    id = db.Column(db.Integer, primary_key=True)
    game_id = db.Column(db.String(100), nullable=False, comment='游戏ID')
    club_name = db.Column(db.String(200), nullable=False, comment='执教俱乐部')
    league_level = db.Column(db.String(20), nullable=False, default='甲级', comment='联赛级别')
    join_date = db.Column(db.String(50), comment='加入联赛时间')
    forum_id = db.Column(db.String(100), comment='论坛ID')
    career = db.Column(db.Text, comment='职业生涯')
    rating = db.Column(db.String(1), nullable=False, default='C', comment='评级S/A/B/C')
    stars = db.Column(db.Integer, nullable=False, default=1, comment='星级1-5')
    honors = db.Column(db.Text, default='', comment='冠军荣誉')
    avatar = db.Column(db.String(500), default='', comment='头像URL')
    motto = db.Column(db.String(500), default='', comment='座右铭')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    comments = db.relationship('Comment', backref='coach', lazy='dynamic',
                               order_by='Comment.created_at.desc()')

    @property
    def comment_count(self):
        return self.comments.count()

    @property
    def total_likes(self):
        return sum(c.likes for c in self.comments)

    @property
    def honor_list(self):
        if not self.honors:
            return []
        return [h.strip() for h in self.honors.split(',') if h.strip()]

    @property
    def honor_count(self):
        return len(self.honor_list)

    @property
    def rating_weight(self):
        """评级排序权重，用于排名"""
        base = RATING_ORDER.get(self.rating, 0)
        return base * 10 + (self.stars or 0)

    @property
    def rating_display(self):
        """评级显示文本，如 S5、A3"""
        return f"{self.rating or 'C'}{self.stars or 1}"

    @property
    def stars_display(self):
        """星星显示"""
        filled = self.stars or 1
        empty = 5 - filled
        return '★' * filled + '☆' * empty

    def to_dict(self):
        return {
            'id': self.id,
            'game_id': self.game_id,
            'club_name': self.club_name,
            'league_level': self.league_level,
            'join_date': self.join_date,
            'forum_id': self.forum_id,
            'career': self.career,
            'rating': self.rating,
            'stars': self.stars,
            'rating_display': self.rating_display,
            'stars_display': self.stars_display,
            'honors': self.honors,
            'honor_list': self.honor_list,
            'honor_count': self.honor_count,
            'avatar': self.avatar,
            'motto': self.motto,
            'comment_count': self.comment_count,
            'total_likes': self.total_likes,
            'created_at': self.created_at.strftime('%Y-%m-%d') if self.created_at else '',
        }


class Comment(db.Model):
    """评论模型"""
    id = db.Column(db.Integer, primary_key=True)
    coach_id = db.Column(db.Integer, db.ForeignKey('coach.id'), nullable=False)
    author_name = db.Column(db.String(100), nullable=False, comment='评论者昵称')
    content = db.Column(db.Text, nullable=False, comment='评论内容')
    likes = db.Column(db.Integer, default=0, comment='点赞数')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'coach_id': self.coach_id,
            'author_name': self.author_name,
            'content': self.content,
            'likes': self.likes,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M') if self.created_at else '',
        }
