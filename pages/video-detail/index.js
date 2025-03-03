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
    isFollowing: false,
    isExpanded: false,
    statusBarHeight: 0,
    gradientBg: 'linear-gradient(120deg, #e0c3fc 0%, #8ec5fc 100%)',
    progress: 0,
    videoDuration: 0,
    isDragging: false,
    isPlaying: true,
    // 评论相关数据
    showComment: false,
    comments: [],
    commentText: '',
    isRefreshing: false,
    page: 1,
    pageSize: 20,
    hasMore: true
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
        objectId: note.objectId,
        content: note.content,
        video: note.video,
        author: {
          objectId: note.author?.objectId,
          nickname: note.author?.nickname || '匿名用户',
          avatar: note.author?.avatar || '/assets/images/default-avatar.png'
        },
        likeCount: note.likeCount || 0,
        favoriteCount: note.favoriteCount || 0,
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

      // 检查是否已关注
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

  // 检查关注状态
  async checkFollowStatus() {
    try {
      const current = wx.Bmob.User.current();
      if (!current || !this.data.note?.author?.objectId) return;

      const query = wx.Bmob.Query("follow");
      const pointerUser = wx.Bmob.Pointer('_User');
      const pointerAuthor = wx.Bmob.Pointer('_User');
      query.equalTo("follower", "==", pointerUser.set(current.objectId));
      query.equalTo("following", "==", pointerAuthor.set(this.data.note.author.objectId));
      const result = await query.find();
      this.setData({
        isFollowing: result.length > 0
      });
    } catch (error) {
      console.error('检查关注状态失败:', error);
    }
  },

  // 处理点赞
  handleLike(e) {
    // 接收来自 action-bar 组件的事件
    const { isLiked, likeCount } = e.detail;
    this.setData({
      'note.likeCount': likeCount
    });
  },

  // 处理收藏
  handleFavorite(e) {
    // 接收来自 action-bar 组件的事件
    const { isFavorited, favoriteCount } = e.detail;
    this.setData({
      'note.favoriteCount': favoriteCount
    });
  },

  // 处理评论
  handleComment() {
    // 检查登录状态
    const current = wx.Bmob.User.current();
    if (!current) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    this.setData({ showComment: true });
    this.loadComments();
  },

  // 隐藏评论弹出层
  hideComment() {
    this.setData({ showComment: false });
  },

  // 加载评论列表
  async loadComments(isRefresh = false) {
    if (isRefresh) {
      this.setData({
        page: 1,
        hasMore: true,
        comments: []
      });
    }

    if (!this.data.hasMore) return;

    // 模拟评论数据
    const mockComments = [
      {
        objectId: '1',
        content: '这个视频太棒了！拍得真好，构图很美，希望能看到更多类似的作品！',
        createTime: '2024-03-05 10:30',
        user: {
          objectId: 'user1',
          nickname: '表情宝宝',
          avatar: ''
        }
      },
      {
        objectId: '2',
        content: '首先 文案说了挺嗨 不知道看不出来哪个的是什么理解能力 还有 嫦娥是cp里面的受唯 这一点cp向没有 这是泥塑好吗 嫦娥无妄之灾',
        createTime: '2024-03-05 10:25',
        user: {
          objectId: 'user2',
          nickname: '美式去冰',
          avatar: ''
        }
      },
      {
        objectId: '3',
        content: '这哥仨比起来，第二个堪称倾国倾城。不过第一个如果男装应该还不粗，鼻子长得可以，第三个我真的......',
        createTime: '2024-03-05 10:20',
        user: {
          objectId: 'user3',
          nickname: '女巫栀栀',
          avatar: ''
        }
      },
      {
        objectId: '4',
        content: '其实都很一般，没看出来哪一个是博主说的小白兔',
        createTime: '2024-03-05 10:15',
        user: {
          objectId: 'user4',
          nickname: '^ungh、',
          avatar: ''
        }
      },
      {
        objectId: '5',
        content: '? @欣欣必上岸',
        createTime: '2024-03-05 10:10',
        user: {
          objectId: 'user5',
          nickname: 'Gloria',
          avatar: ''
        }
      }
    ];

    // 模拟分页
    const start = (this.data.page - 1) * this.data.pageSize;
    const end = start + this.data.pageSize;
    const pageComments = mockComments.slice(start, end);

    this.setData({
      comments: [...this.data.comments, ...pageComments],
      page: this.data.page + 1,
      hasMore: pageComments.length === this.data.pageSize,
      isRefreshing: false
    });

    // 更新评论总数
    if (this.data.page === 2) {
      this.setData({
        'note.commentCount': mockComments.length
      });
    }
  },

  // 刷新评论列表
  onRefresh() {
    this.setData({ isRefreshing: true });
    this.loadComments(true);
  },

  // 监听评论输入
  onCommentInput(e) {
    this.setData({
      commentText: e.detail.value
    });
  },

  // 提交评论
  async submitComment() {
    if (!this.data.commentText.trim()) {
      wx.showToast({
        title: '请输入评论内容',
        icon: 'none'
      });
      return;
    }

    const current = wx.Bmob.User.current();
    if (!current) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    try {
      const query = wx.Bmob.Query('comment');
      query.set('noteId', this.data.note.objectId);
      query.set('content', this.data.commentText.trim());
      query.set('user', current.objectId);
      await query.save();

      // 更新评论数
      const noteQuery = wx.Bmob.Query('note');
      noteQuery.get(this.data.note.objectId).then(note => {
        note.increment('commentCount');
        return note.save();
      });

      // 清空输入框并刷新评论列表
      this.setData({ commentText: '' });
      this.loadComments(true);

      wx.showToast({
        title: '评论成功',
        icon: 'success'
      });
    } catch (error) {
      console.error('提交评论失败:', error);
      wx.showToast({
        title: '评论失败',
        icon: 'none'
      });
    }
  },

  // 处理分享
  handleShare() {
    // 使用小程序原生分享
  },

  // 处理关注状态变化
  async handleFollowChange(e) {
    const { isFollowing, userId } = e.detail;
    
    try {
      const current = wx.Bmob.User.current();
      if (!current) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        return;
      }

      const query = wx.Bmob.Query("follow");
      
      if (isFollowing) {
        // 添加关注
        query.set("follower", current.objectId);
        query.set("following", userId);
        await query.save();
        
        wx.showToast({
          title: '已关注',
          icon: 'success'
        });
      } else {
        // 取消关注
        query.equalTo("follower", "==", current.objectId);
        query.equalTo("following", "==", userId);
        const follows = await query.find();
        if (follows.length > 0) {
          await query.destroy(follows[0].objectId);
        }
        
        wx.showToast({
          title: '已取消关注',
          icon: 'success'
        });
      }

      // 更新关注状态
      this.setData({
        isFollowing: isFollowing
      });
    } catch (error) {
      console.error('关注操作失败:', error);
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    }
  },

  // 关注作者 (可以删除或保留作为备用)
  async followAuthor() {
    // 这个方法可以删除，因为我们现在使用组件处理关注逻辑
    // 或者保留作为备用
    const userId = this.data.note?.author?.objectId;
    if (userId) {
      this.handleFollowChange({
        detail: {
          isFollowing: !this.data.isFollowing,
          userId: userId
        }
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

  // 分享给朋友
  onShareAppMessage() {
    return {
      title: this.data.note?.content || '分享一个视频',
      path: `/pages/video-detail/index?id=${this.data.note?.objectId}`
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: this.data.note?.content || '分享一个视频',
      query: `id=${this.data.note?.objectId}`
    };
  },

  // 页面卸载
  onUnload() {
    if (this.videoContext) {
      this.videoContext.pause();
    }
  },

  // 视频播放进度更新
  onTimeUpdate(e) {
    if (!this.data.isDragging) {
      const { currentTime, duration } = e.detail;
      const progress = (currentTime / duration) * 100;
      this.setData({
        progress,
        videoDuration: duration
      });
    }
  },

  // 进度条触摸开始
  onProgressTouchStart() {
    this.setData({
      isDragging: true
    });
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
      this.setData({
        isDragging: false
      });
    }
  },

  // 根据触摸位置更新进度
  updateProgressByTouch(e) {
    const touch = e.touches[0];
    const progressBar = wx.createSelectorQuery().select('.progress-bar');
    progressBar.boundingClientRect((rect) => {
      if (!rect) return;
      const progress = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100));
      const currentTime = (progress / 100) * this.data.videoDuration;
      this.setData({ progress });
      this.videoContext.seek(currentTime);
    }).exec();
  }
}); 