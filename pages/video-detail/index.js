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

// 工具函数：格式化评论时间
function formatCommentTime(dateString) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  
  // 一分钟内
  if (diff < 60 * 1000) {
    return '刚刚';
  }
  
  // 一小时内
  if (diff < 60 * 60 * 1000) {
    return Math.floor(diff / (60 * 1000)) + '分钟前';
  }
  
  // 一天内
  if (diff < 24 * 60 * 60 * 1000) {
    return Math.floor(diff / (60 * 60 * 1000)) + '小时前';
  }
  
  // 一周内
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return Math.floor(diff / (24 * 60 * 60 * 1000)) + '天前';
  }
  
  // 超过一周，显示具体日期
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const Bmob = require('../../utils/Bmob-2.5.30.min.js');

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
    hasMore: true,
    isLoading: false,
    // 视频列表相关
    videoList: [],
    currentVideoIndex: 0,
    viewedVideoIds: [], // 记录已浏览过的视频ID
    isLoadingMore: false,
    videoPage: 1,
    videoPageSize: 10,
    hasMoreVideos: true,
    startY: 0,
    moveY: 0,
    direction: '', // 滑动方向：'up' 或 'down'
    touchStartTime: 0,
    isSwitching: false // 是否正在切换视频
  },

  onLoad(options) {
    // 获取状态栏高度
    const systemInfo = wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight,
      gradientBg: 'linear-gradient(120deg, #e0c3fc 0%, #8ec5fc 100%)',
      isPlaying: true,
      progress: 0,
      isExpanded: false,
      showComment: false,
      commentText: '',
      comments: [],
      page: 1,
      pageSize: 10,
      hasMore: true,
      isRefreshing: false,
      isLoading: false,
      viewedVideoIds: [], // 初始化已浏览视频ID数组
      videoPage: 1,
      videoPageSize: 10,
      hasMoreVideos: true,
      isLoadingMore: false
    });

    // 获取视频实例
    this.videoContext = wx.createVideoContext('myVideo');

    // 加载笔记数据
    if (options.id) {
      this.loadNoteData(options.id);
      // 将当前视频ID添加到已浏览列表
      this.setData({
        viewedVideoIds: [options.id]
      });
      // 加载视频列表
      this.loadVideoList();
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
  async loadNoteData(id) {
    return new Promise(async (resolve, reject) => {
      try {
        wx.showLoading({ title: '加载中' });
        
        const query = wx.Bmob.Query('note');
        query.include('author');
        const note = await query.get(id);
        
        if (!note) {
          wx.showToast({
            title: '笔记不存在',
            icon: 'none'
          });
          reject(new Error('笔记不存在'));
          return;
        }
        
        // 格式化笔记数据
        const formattedNote = {
          objectId: note.objectId,
          content: note.content || '',
          video: note.video || '',
          likeCount: note.likeCount || 0,
          commentCount: note.commentCount || 0,
          shareCount: note.shareCount || 0,
          author: {
            objectId: note.author ? note.author.objectId : '',
            nickname: note.author ? note.author.nickname || '匿名用户' : '匿名用户',
            avatar: note.author ? note.author.avatar || '' : '',
            signature: note.author ? note.author.signature || '' : ''
          }
        };
        
        this.setData({ note: formattedNote });
        
        // 加载评论
        this.loadComments();
        
        wx.hideLoading();
        resolve(formattedNote);
      } catch (error) {
        console.error('加载笔记失败:', error);
        wx.hideLoading();
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
        reject(error);
      }
    });
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
    if (!this.data.hasMore && !isRefresh) return;
    if (this.data.isLoading) return; // 防止重复加载
    
    if (!this.data.note || !this.data.note.objectId) {
      console.log('笔记ID不存在，无法加载评论');
      return;
    }
    
    this.setData({ isLoading: true });
    
    try {
      const page = isRefresh ? 1 : this.data.page;
      const query = wx.Bmob.Query('comment');
      const notePointer = wx.Bmob.Pointer('note');
      
      query.equalTo('note', '==', notePointer.set(this.data.note.objectId));
      query.equalTo('status', '==', 1); // 状态正常的评论
      query.include('user','author');
      query.order('-createdAt');
      query.limit(this.data.pageSize);
      query.skip((page - 1) * this.data.pageSize);
      
      const comments = await query.find();
      console.log('评论列表:', comments);
      
      // 格式化评论数据
      const formattedComments = comments.map(comment => {
        // 优先使用author字段，如果不存在则使用user字段
        const userInfo = comment.author || comment.user || {};
        return {
          objectId: comment.objectId,
          content: comment.content,
          createTime: formatCommentTime(comment.createdAt),
          user: {
            objectId: userInfo.objectId || '',
            nickname: userInfo.nickname || '匿名用户',
            avatar: userInfo.avatar || ''
          }
        };
      });
      
      this.setData({
        comments: isRefresh ? formattedComments : [...this.data.comments, ...formattedComments],
        page: page + 1,
        hasMore: comments.length === this.data.pageSize,
        isRefreshing: false,
        isLoading: false
      });
    } catch (error) {
      console.error('加载评论失败:', error);
      this.setData({ 
        isRefreshing: false,
        isLoading: false 
      });
      wx.showToast({
        title: '加载评论失败',
        icon: 'none'
      });
    }
  },

  // 下拉刷新
  onRefresh() {
    this.setData({ isRefreshing: true });
    this.loadComments(true);
  },

  // 上拉加载更多
  onLoadMore() {
    if (this.data.hasMore && !this.data.isLoading) {
      console.log('加载更多评论');
      this.loadComments();
    }
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
      // 创建评论
      const comment = wx.Bmob.Query('comment');
      const notePointer = wx.Bmob.Pointer('note');
      const userPointer = wx.Bmob.Pointer('_User');
      
      comment.set('content', this.data.commentText.trim());
      comment.set('note', notePointer.set(this.data.note.objectId));
      comment.set('user', userPointer.set(current.objectId));
      comment.set('author', userPointer.set(current.objectId));
      comment.set('status', 1); // 1表示正常状态
      comment.set('level', 1);  // 1级评论
      
      const result = await comment.save();
      console.log('评论保存成功:', result);

      // 更新笔记评论数
      const noteQuery = wx.Bmob.Query('note');
      const note = await noteQuery.get(this.data.note.objectId);
      note.increment('commentCount');
      await note.save();
      
      // 更新本地评论数
      this.setData({
        'note.commentCount': (this.data.note.commentCount || 0) + 1,
        commentText: ''
      });

      // 刷新评论列表
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
  handleFollowChange(e) {
    const { isFollowing } = e.detail;
    
    // 只需更新页面状态，关注/取消关注的逻辑已在组件中实现
    this.setData({
      isFollowing: isFollowing
    });
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
  },

  // 加载视频列表
  async loadVideoList(isRefresh = false) {
    if (this.data.isLoadingMore || (!this.data.hasMoreVideos && !isRefresh)) {
      return;
    }

    this.setData({
      isLoadingMore: true
    });

    const page = isRefresh ? 1 : this.data.videoPage;
    
    try {
      const query = Bmob.Query('note');
      // 只查询有视频的笔记
      query.equalTo("video", "!=", "");
      // 排除已浏览过的视频
      if (this.data.viewedVideoIds.length > 0) {
        query.equalTo('objectId', "!=",this.data.viewedVideoIds);
      }
      query.order('-createdAt');
      query.limit(this.data.videoPageSize);
      query.skip((page - 1) * this.data.videoPageSize);
      query.include('author');
      // console.log('查询视频列表:', query.toJSON());
      const result = await query.find();
      console.log('查询视频列表结果:', result);
      
      // 处理视频数据
      const videoList = result.map(note => {
        return {
          ...note,
          createTime: formatTime(note.createdAt)
        };
      });
      
      if (isRefresh) {
        this.setData({
          videoList,
          videoPage: 2,
          hasMoreVideos: videoList.length === this.data.videoPageSize
        });
      } else {
        this.setData({
          videoList: [...this.data.videoList, ...videoList],
          videoPage: page + 1,
          hasMoreVideos: videoList.length === this.data.videoPageSize
        });
      }
    } catch (error) {
      console.error('加载视频列表失败:', error);
      wx.showToast({
        title: '加载视频失败',
        icon: 'none'
      });
    } finally {
      this.setData({
        isLoadingMore: false
      });
    }
  },

  // 处理触摸开始事件
  handleTouchStart(e) {
    this.setData({
      startY: e.touches[0].clientY,
      touchStartTime: Date.now(),
      direction: ''
    });
  },

  // 处理触摸移动事件
  handleTouchMove(e) {
    if (this.data.isSwitching) return;
    
    const moveY = e.touches[0].clientY;
    const diffY = moveY - this.data.startY;
    
    // 判断滑动方向
    const direction = diffY < 0 ? 'up' : 'down';
    
    this.setData({
      moveY,
      direction
    });
  },

  // 处理触摸结束事件
  handleTouchEnd(e) {
    if (this.data.isSwitching) return;
    
    const endTime = Date.now();
    const touchDuration = endTime - this.data.touchStartTime;
    const diffY = this.data.moveY - this.data.startY;
    const absY = Math.abs(diffY);
    
    // 判断是否为有效的滑动手势（滑动距离足够大且速度足够快）
    if (absY > 50 && touchDuration < 300) {
      if (diffY < 0) { // 上滑
        this.switchToNextVideo();
      } else { // 下滑
        this.switchToPrevVideo();
      }
    }
  },

  // 切换到下一个视频
  switchToNextVideo() {
    if (this.data.isSwitching) return;
    
    // 检查是否有下一个视频
    if (this.data.currentVideoIndex < this.data.videoList.length - 1) {
      this.switchVideo(this.data.currentVideoIndex + 1);
    } else {
      // 如果已经是最后一个视频，加载更多
      if (this.data.hasMoreVideos && !this.data.isLoadingMore) {
        this.setData({
          isSwitching: true
        });
        
        wx.showLoading({
          title: '加载中...',
        });
        
        this.loadVideoList().then(() => {
          // 加载完成后，如果有新视频，切换到下一个
          if (this.data.currentVideoIndex < this.data.videoList.length - 1) {
            this.switchVideo(this.data.currentVideoIndex + 1);
          } else {
            wx.showToast({
              title: '没有更多视频了',
              icon: 'none'
            });
            this.setData({
              isSwitching: false
            });
          }
          wx.hideLoading();
        });
      } else {
        wx.showToast({
          title: '没有更多视频了',
          icon: 'none'
        });
      }
    }
  },

  // 切换到上一个视频
  switchToPrevVideo() {
    if (this.data.isSwitching) return;
    
    // 检查是否有上一个视频
    if (this.data.currentVideoIndex > 0) {
      this.switchVideo(this.data.currentVideoIndex - 1);
    } else {
      wx.showToast({
        title: '已经是第一个视频',
        icon: 'none'
      });
    }
  },

  // 切换到指定索引的视频
  switchVideo(index) {
    if (this.data.isSwitching) return;
    
    this.setData({
      isSwitching: true
    });
    
    // 暂停当前视频
    if (this.videoContext) {
      this.videoContext.pause();
    }
    
    const targetVideo = this.data.videoList[index];
    if (!targetVideo) {
      this.setData({
        isSwitching: false
      });
      return;
    }
    
    // 更新当前视频索引
    this.setData({
      currentVideoIndex: index
    });
    
    // 加载新视频数据
    this.loadNoteData(targetVideo.objectId).then(() => {
      // 将新视频ID添加到已浏览列表
      const viewedVideoIds = [...this.data.viewedVideoIds];
      if (!viewedVideoIds.includes(targetVideo.objectId)) {
        viewedVideoIds.push(targetVideo.objectId);
      }
      
      this.setData({
        viewedVideoIds,
        isSwitching: false,
        progress: 0,
        isExpanded: false
      });
      
      // 播放新视频
      this.videoContext = wx.createVideoContext('myVideo');
      this.videoContext.play();
    });
  }
}); 