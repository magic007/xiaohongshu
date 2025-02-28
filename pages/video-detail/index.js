// 格式化时间
function formatTime(dateStr) {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hour = date.getHours().toString().padStart(2, '0');
  const minute = date.getMinutes().toString().padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

Page({
  data: {
    note: null,
    isLiked: false,
    isCollected: false,
    isFollowing: false,
    isExpanded: false,
    statusBarHeight: 0,
    gradientBg: 'linear-gradient(120deg, #e0c3fc 0%, #8ec5fc 100%)',
    progress: 0,
    videoDuration: 0,
    isDragging: false,
    isPlaying: true
  },

  onLoad(options) {
    // 获取状态栏高度
    const systemInfo = wx.getSystemInfoSync();
    const statusBarHeight = systemInfo.statusBarHeight;
    this.setData({ statusBarHeight });

    // 加载笔记数据
    if (options.id) {
      this.loadNoteData(options.id);
    }

    this.checkFollowStatus();
  },

  onReady() {
    this.videoContext = wx.createVideoContext('myVideo');
  },

  onShow() {
    // 页面显示时自动播放视频
    if (this.videoContext) {
      this.videoContext.play();
    }
  },

  onHide() {
    // 页面隐藏时暂停视频
    if (this.videoContext) {
      this.videoContext.pause();
    }
  },

  // 切换视频播放状态
  togglePlay() {
    if (this.data.isPlaying) {
      this.videoContext.pause();
    } else {
      this.videoContext.play();
    }
    this.setData({
      isPlaying: !this.data.isPlaying
    });
  },

  // 视频播放事件
  onVideoPlay() {
    console.log('视频开始播放');
    this.setData({
      isPlaying: true
    });
  },

  // 视频暂停事件
  onVideoPause() {
    console.log('视频暂停播放');
    this.setData({
      isPlaying: false
    });
  },

  // 视频错误事件
  onVideoError(e) {
    console.error('视频播放错误:', e.detail.errMsg);
    wx.showToast({
      title: '视频加载失败',
      icon: 'none'
    });
  },

  // 加载笔记数据
  async loadNoteData(noteId) {
    const query = wx.Bmob.Query("note");
    query.include("author");
    try {
      const note = await query.get(noteId);
      console.log('笔记数据：', note);
      
      // 格式化笔记数据
      const formattedNote = {
        id: note.objectId,
        content: note.content,
        video: note.video,
        author: {
          id: note.author?.objectId,
          nickname: note.author?.nickname || '匿名用户',
          avatar: note.author?.avatar || '/assets/images/default-avatar.png'
        },
        likes: note.likeCount || 0,
        commentCount: note.commentCount || 0,
        createTime: formatTime(note.createdAt),
        tags: note.tags || []
      };

      this.setData({ note: formattedNote }, () => {
        // 数据加载完成后自动播放视频
        if (this.videoContext) {
          this.videoContext.play();
        }
      });

      // 检查是否已点赞、收藏和关注
      this.checkLikeStatus(noteId);
      this.checkCollectStatus(noteId);
      if (note.author?.objectId) {
        this.checkFollowStatus();
      }
    } catch (error) {
      console.error('加载笔记失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  // 检查点赞状态
  async checkLikeStatus(noteId) {
    const current = wx.Bmob.User.current();
    if (!current) return;

    const query = wx.Bmob.Query("like");
    const pointerUser = wx.Bmob.Pointer('_User');
    const pointerNote = wx.Bmob.Pointer('note');
    query.equalTo("user", pointerUser.set(current.objectId));
    query.equalTo("note", pointerNote.set(noteId));
    
    try {
      const likes = await query.find();
      this.setData({
        isLiked: likes.length > 0
      });
    } catch (error) {
      console.error('检查点赞状态失败:', error);
    }
  },

  // 检查收藏状态
  async checkCollectStatus(noteId) {
    const current = wx.Bmob.User.current();
    if (!current) return;

    const query = wx.Bmob.Query("favorite");
    const pointerUser = wx.Bmob.Pointer('_User');
    const pointerNote = wx.Bmob.Pointer('note');
    query.equalTo("user", pointerUser.set(current.objectId));
    query.equalTo("note", pointerNote.set(noteId));
    
    try {
      const favorites = await query.find();
      this.setData({
        isCollected: favorites.length > 0
      });
    } catch (error) {
      console.error('检查收藏状态失败:', error);
    }
  },

  // 检查关注状态
  async checkFollowStatus() {
    try {
      const current = wx.Bmob.User.current();
      if (!current || !this.data.note?.author?.objectId) return;

      const query = wx.Bmob.Query("follow");
      const pointerUser = wx.Bmob.Pointer('_User');
      const pointerAuthor = wx.Bmob.Pointer('_User');
      query.equalTo("follower", pointerUser.set(current.objectId));
      query.equalTo("following", pointerAuthor.set(this.data.note.author.objectId));
      const result = await query.find();
      this.setData({
        isFollowing: result.length > 0
      });
    } catch (error) {
      console.error('检查关注状态失败:', error);
    }
  },

  // 处理点赞
  async handleLike() {
    const current = wx.Bmob.User.current();
    if (!current) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    const noteId = this.data.note.id;
    const query = wx.Bmob.Query("like");
    
    try {
      if (this.data.isLiked) {
        // 取消点赞
        query.equalTo("user", "==", current.objectId);
        query.equalTo("note", "==", noteId);
        const likes = await query.find();
        if (likes.length > 0) {
          await query.destroy(likes[0].objectId);
        }
      } else {
        // 添加点赞
        query.set("user", current.objectId);
        query.set("note", noteId);
        await query.save();
      }

      // 更新点赞状态和数量
      this.setData({
        isLiked: !this.data.isLiked,
        'note.likes': this.data.isLiked ? this.data.note.likes - 1 : this.data.note.likes + 1
      });
    } catch (error) {
      console.error('点赞操作失败:', error);
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    }
  },

  // 处理收藏
  async handleCollect() {
    const current = wx.Bmob.User.current();
    if (!current) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    const noteId = this.data.note.id;
    const query = wx.Bmob.Query("favorite");
    
    try {
      if (this.data.isCollected) {
        // 取消收藏
        query.equalTo("user", "==", current.objectId);
        query.equalTo("note", "==", noteId);
        const favorites = await query.find();
        if (favorites.length > 0) {
          await query.destroy(favorites[0].objectId);
        }
      } else {
        // 添加收藏
        query.set("user", current.objectId);
        query.set("note", noteId);
        await query.save();
      }

      // 更新收藏状态
      this.setData({
        isCollected: !this.data.isCollected
      });

      wx.showToast({
        title: this.data.isCollected ? '已收藏' : '已取消收藏',
        icon: 'success'
      });
    } catch (error) {
      console.error('收藏操作失败:', error);
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    }
  },

  // 处理评论
  handleComment() {
    // TODO: 实现评论功能
    wx.showToast({
      title: '评论功能开发中',
      icon: 'none'
    });
  },

  // 处理分享
  handleShare() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
  },

  // 关注/取消关注作者
  async followAuthor() {
    if (!wx.Bmob.User.current()) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    try {
      if (this.data.isFollowing) {
        // 取消关注
        const query = new wx.Bmob.Query('follow')
        const pointer = wx.Bmob.Pointer('_User')
        const poiID = pointer.set(wx.Bmob.User.current().objectId)
        query.equalTo('follower', "==", poiID)
        const poiID2 = pointer.set(this.data.note.author.id)
        query.equalTo('following', "==", poiID2)
        const followResult = await query.find()
        if (followResult.length > 0) {
          const follow = wx.Bmob.Query('follow');
          await follow.destroy(followResult[0].objectId);
        }
      } else {
        // 添加关注
        const followerId = wx.Bmob.User.current().objectId;
        const followingId = this.data.note.author.id;
        const follow = wx.Bmob.Query('follow')
        const pointer = wx.Bmob.Pointer('_User')
        const poiID = pointer.set(followerId)
        follow.set('follower', poiID)
        const poiID2 = pointer.set(followingId)
        follow.set('following', poiID2)
        follow.set('status', 1)
        await follow.save()
      }

      this.setData({
        isFollowing: !this.data.isFollowing
      });

      wx.showToast({
        title: this.data.isFollowing ? '关注成功' : '已取消关注',
        icon: 'success'
      });
    } catch (error) {
      console.error('关注操作失败:', error);
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'none'
      });
    }
  },

  // 展开/收起文本
  toggleExpand() {
    this.setData({
      isExpanded: !this.data.isExpanded
    });
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  },

  // 返回首页
  goHome() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  onShareAppMessage() {
    return {
      title: this.data.note.title,
      path: `/pages/video-detail/index?id=${this.data.note.id}`
    };
  },

  onShareTimeline() {
    return {
      title: this.data.note.title,
      query: `id=${this.data.note.id}`
    };
  },

  onUnload() {
    // 页面卸载时释放视频上下文
    this.videoContext = null;
  },

  // 视频播放进度更新
  onTimeUpdate(e) {
    const { currentTime, duration } = e.detail;
    // 记录视频总时长
    if (duration !== this.data.videoDuration) {
      this.setData({ videoDuration: duration });
    }
    // 非拖动状态下更新进度
    if (!this.data.isDragging) {
      const progress = (currentTime / duration) * 100;
      this.setData({ progress });
    }
  },

  // 进度条触摸开始
  onProgressTouchStart(e) {
    this.setData({ isDragging: true });
    this.updateProgressByTouch(e);
  },

  // 进度条触摸移动
  onProgressTouchMove(e) {
    if (this.data.isDragging) {
      this.updateProgressByTouch(e);
    }
  },

  // 进度条触摸结束
  onProgressTouchEnd(e) {
    if (this.data.isDragging) {
      this.updateProgressByTouch(e);
      this.setData({ isDragging: false });
      // 跳转到对应时间点
      const time = (this.data.progress / 100) * this.data.videoDuration;
      this.videoContext.seek(time);
    }
  },

  // 根据触摸位置更新进度
  updateProgressByTouch(e) {
    const touch = e.touches[0];
    const progressBar = wx.createSelectorQuery();
    progressBar.select('.progress-bar').boundingClientRect((rect) => {
      if (rect) {
        const progress = Math.min(Math.max(((touch.clientX - rect.left) / rect.width) * 100, 0), 100);
        this.setData({ progress });
      }
    }).exec();
  }
}); 