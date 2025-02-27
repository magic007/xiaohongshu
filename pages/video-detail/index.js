Page({
  data: {
    note: null,
    isLiked: false,
    isCollected: false,
    statusBarHeight: 20,
    gradientBg: 'linear-gradient(120deg, #e0c3fc 0%, #8ec5fc 100%)'
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

  // 视频播放事件
  onVideoPlay() {
    console.log('视频开始播放');
  },

  // 视频暂停事件
  onVideoPause() {
    console.log('视频暂停播放');
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
        title: note.content,
        content: note.content,
        video: note.video,
        author: {
          nickname: note.author?.nickname || '匿名用户',
          avatar: note.author?.avatar || '/assets/images/default-avatar.png'
        },
        likes: note.likeCount || 0,
        commentCount: note.commentCount || 0
      };

      this.setData({ note: formattedNote }, () => {
        // 数据加载完成后自动播放视频
        if (this.videoContext) {
          this.videoContext.play();
        }
      });

      // 检查是否已点赞和收藏
      this.checkLikeStatus(noteId);
      this.checkCollectStatus(noteId);
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
    query.equalTo("user", "==", current.objectId);
    query.equalTo("note", "==", noteId);
    
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
    query.equalTo("user", "==", current.objectId);
    query.equalTo("note", "==", noteId);
    
    try {
      const favorites = await query.find();
      this.setData({
        isCollected: favorites.length > 0
      });
    } catch (error) {
      console.error('检查收藏状态失败:', error);
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

  // 关注作者
  async followAuthor() {
    const current = wx.Bmob.User.current();
    if (!current) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    // TODO: 实现关注功能
    wx.showToast({
      title: '关注功能开发中',
      icon: 'none'
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
  }
}); 