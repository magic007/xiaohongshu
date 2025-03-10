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
    isSwitching: false, // 是否正在切换视频
    // 视频切换动画相关
    nextVideo: null, // 预加载的下一个视频
    prevVideo: null, // 预加载的上一个视频
    currentVideoVisible: true, // 当前视频是否可见
    nextVideoVisible: false, // 下一个视频是否可见
    prevVideoVisible: false, // 上一个视频是否可见
    transitionClass: '', // 过渡动画类名
    animationTimer: null, // 动画定时器
    // 新增动画相关数据
    videoAnimationClass: '', // 当前视频动画类名
    nextVideoAnimationClass: '', // 下一个视频动画类名
    dragDistance: 0, // 拖动距离
    dragThreshold: 150, // 触发切换的阈值
    showGestureIndicator: false, // 是否显示手势指示器
    touchActive: false, // 是否处于触摸状态
    videoContainerStyle: '', // 视频容器样式
    videoContainerHeight: 0, // 视频容器高度
  },

  onLoad(options) {
    // 获取系统信息
    const systemInfo = wx.getSystemInfoSync();
    const videoContainerHeight = systemInfo.windowHeight;
    
    this.setData({
      videoContainerHeight,
      statusBarHeight: systemInfo.statusBarHeight,
      // 其他初始化数据
      noteId: options.id || '',
      currentVideoIndex: 0,
      videoList: [],
      videoPage: 1,
      videoPageSize: 10,
      hasMoreVideos: true,
      viewedVideoIds: [],
      isLoadingMore: false,
      comments: [],
      commentPage: 1,
      commentPageSize: 10,
      hasMore: true,
      isLoading: false,
      isRefreshing: false,
      commentText: '',
      showComment: false,
      isPlaying: true,
      progress: 0,
      isExpanded: false,
      isFollowing: false,
      gradientBg: 'linear-gradient(120deg, #e0c3fc 0%, #8ec5fc 100%)',
      isSwitching: false,
      dragThreshold: 150,
      showGestureIndicator: false,
      touchActive: false
    });
    
    // 初始化视频上下文
    this.currentVideoContext = null;
    this.nextVideoContext = null;
    this.prevVideoContext = null;
    
    // 加载笔记数据
    if (options.id) {
      wx.showLoading({
        title: '加载中...',
      });
      this.loadNoteData(options.id);
    } else {
      // 如果没有指定ID，加载视频列表
      this.loadVideoList(true).then(() => {
        if (this.data.videoList.length > 0) {
          const firstVideo = this.data.videoList[0];
          this.loadNoteData(firstVideo.objectId);
        }
      });
    }
  },

  onReady() {
    this.currentVideoContext = wx.createVideoContext('currentVideo');
    this.nextVideoContext = wx.createVideoContext('nextVideo');
  },

  onShow() {
    // 页面显示时自动播放视频
    if (this.currentVideoContext) {
      this.currentVideoContext.play();
    }
  },

  onHide() {
    // 页面隐藏时暂停视频
    if (this.currentVideoContext) {
      this.currentVideoContext.pause();
    }
    if (this.nextVideoContext) {
      this.nextVideoContext.pause();
    }
  },

  // 切换视频播放状态
  togglePlay() {
    if (this.data.isPlaying) {
      this.currentVideoContext.pause();
    } else {
      this.currentVideoContext.play();
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
        
        this.setData({
          note: formattedNote,
          currentVideoVisible: true,
          isPlaying: true
        });
        
        // 加载评论
        this.loadComments();
        
        // 预加载上下个视频
        this.preloadVideos();
        
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

  // 预加载视频
  preloadVideos() {
    const { currentVideoIndex, videoList } = this.data;
    
    // 预加载下一个视频
    if (currentVideoIndex < videoList.length - 1) {
      const nextVideo = videoList[currentVideoIndex + 1];
      this.setData({
        nextVideo,
        nextVideoVisible: true
      });
      
      // 创建下一个视频的上下文
      setTimeout(() => {
        this.nextVideoContext = wx.createVideoContext('nextVideo');
        // 预加载但不播放
        this.nextVideoContext.play();
        setTimeout(() => {
          this.nextVideoContext.pause();
          this.nextVideoContext.seek(0);
        }, 500);
      }, 100);
    }
    
    // 预加载上一个视频
    if (currentVideoIndex > 0) {
      const prevVideo = videoList[currentVideoIndex - 1];
      this.setData({
        prevVideo,
        prevVideoVisible: true
      });
      
      // 创建上一个视频的上下文
      setTimeout(() => {
        this.prevVideoContext = wx.createVideoContext('prevVideo');
        // 预加载但不播放
        this.prevVideoContext.play();
        setTimeout(() => {
          this.prevVideoContext.pause();
          this.prevVideoContext.seek(0);
        }, 500);
      }, 100);
    }
    
    // 如果接近列表末尾，加载更多视频
    if (currentVideoIndex >= videoList.length - 3 && !this.data.isLoadingMore && this.data.hasMoreVideos) {
      this.loadVideoList();
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
    // 清除定时器
    if (this.data.animationTimer) {
      clearTimeout(this.data.animationTimer);
    }
    
    // 暂停视频
    if (this.currentVideoContext) {
      this.currentVideoContext.pause();
    }
    if (this.nextVideoContext) {
      this.nextVideoContext.pause();
    }
    if (this.prevVideoContext) {
      this.prevVideoContext.pause();
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
      this.currentVideoContext.seek(currentTime);
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
        query.equalTo('objectId', "!=", this.data.viewedVideoIds);
      }
      query.order('-createdAt');
      query.limit(this.data.videoPageSize);
      query.skip((page - 1) * this.data.videoPageSize);
      query.include('author');
      
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

      // 预加载下一个视频
      if (!this.data.nextVideo && videoList.length > 0) {
        const nextIndex = this.data.currentVideoIndex + 1;
        if (nextIndex < this.data.videoList.length) {
          this.setData({
            nextVideo: this.data.videoList[nextIndex]
          });
        }
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
    // 如果正在切换视频或评论弹窗打开，不处理滑动事件
    if (this.data.isSwitching || this.data.showComment) return;
    
    const touch = e.touches[0];
    
    this.setData({
      touchStartX: touch.clientX,
      touchStartY: touch.clientY,
      touchStartTime: Date.now(),
      touchActive: true,
      dragDistance: 0,
      direction: ''
    });
  },

  // 处理触摸移动事件
  handleTouchMove(e) {
    // 如果正在切换视频或评论弹窗打开，不处理滑动事件
    if (this.data.isSwitching || this.data.showComment) return;
    
    if (!this.data.touchActive) return;
    
    const touch = e.touches[0];
    const diffY = touch.clientY - this.data.touchStartY;
    
    // 如果是水平滑动，不处理
    const diffX = touch.clientX - this.data.touchStartX;
    if (Math.abs(diffX) > Math.abs(diffY)) return;
    
    // 如果还没有开始拖动，且移动距离超过阈值，开始拖动
    if (!this.data.isDragging && Math.abs(diffY) > 10) {
      this.setData({
        isDragging: true,
        showGestureIndicator: true
      });
    }
    
    if (!this.data.isDragging) return;
    
    // 计算拖动距离，添加阻尼效果
    const dampingFactor = 0.5; // 阻尼系数，值越小阻力越大
    const dragDistance = diffY * dampingFactor;
    
    // 更新方向提示
    let direction = '';
    if (dragDistance < -30) {
      direction = 'up';
    } else if (dragDistance > 30) {
      direction = 'down';
    }
    
    // 设置视频容器位置
    // 默认位置是 -100vh，向上拖动是负值，向下拖动是正值
    const translateY = -this.data.videoContainerHeight + dragDistance;
    const videoContainerStyle = `transform: translateY(${translateY}px)`;
    
    this.setData({
      dragDistance,
      direction,
      videoContainerStyle
    });
  },

  // 处理触摸结束事件
  handleTouchEnd(e) {
    // 如果正在切换视频或评论弹窗打开，不处理滑动事件
    if (this.data.isSwitching || this.data.showComment) return;
    
    // 隐藏手势指示器
    this.setData({
      showGestureIndicator: false,
      touchActive: false
    });
    
    if (!this.data.isDragging) return;
    
    const endTime = Date.now();
    const touchDuration = endTime - this.data.touchStartTime;
    const diffY = this.data.dragDistance;
    const absY = Math.abs(diffY);
    
    // 重置拖动状态
    this.setData({
      isDragging: false
    });
    
    // 判断是否为有效的滑动手势
    // 1. 快速滑动：短时间内移动一定距离
    // 2. 长距离滑动：移动距离超过阈值
    if ((absY > 30 && touchDuration < 300) || absY > this.data.dragThreshold) {
      if (diffY < 0) { // 上滑
        // 检查是否有下一个视频
        if (this.data.currentVideoIndex < this.data.videoList.length - 1) {
          this.animateSwitchVideo('up', this.data.currentVideoIndex + 1);
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
                this.animateSwitchVideo('up', this.data.currentVideoIndex + 1);
              } else {
                wx.showToast({
                  title: '没有更多视频了',
                  icon: 'none'
                });
                this.setData({
                  isSwitching: false
                });
                // 恢复原位
                this.resetPosition();
              }
              wx.hideLoading();
            });
          } else {
            wx.showToast({
              title: '没有更多视频了',
              icon: 'none'
            });
            // 恢复原位
            this.resetPosition();
          }
        }
      } else { // 下滑
        // 检查是否有上一个视频
        if (this.data.currentVideoIndex > 0) {
          this.animateSwitchVideo('down', this.data.currentVideoIndex - 1);
        } else {
          wx.showToast({
            title: '已经是第一个视频',
            icon: 'none'
          });
          // 恢复原位
          this.resetPosition();
        }
      }
    } else {
      // 如果不是有效的滑动手势，恢复原位
      this.resetPosition();
    }
  },

  // 重置位置
  resetPosition() {
    const translateY = -this.data.videoContainerHeight;
    this.setData({
      videoContainerStyle: `transform: translateY(${translateY}px); transition: transform 0.3s ease`,
      direction: ''
    });
    
    // 300ms后清除过渡效果
    setTimeout(() => {
      this.setData({
        videoContainerStyle: `transform: translateY(${translateY}px)`
      });
    }, 300);
  },

  // 带动画效果切换视频
  animateSwitchVideo(direction, targetIndex) {
    if (this.data.isSwitching) return;
    
    const targetVideo = this.data.videoList[targetIndex];
    if (!targetVideo) {
      this.resetPosition();
      return;
    }
    
    this.setData({
      isSwitching: true,
      direction
    });
    
    // 暂停当前视频
    if (this.currentVideoContext) {
      this.currentVideoContext.pause();
    }
    
    // 更新当前视频索引
    this.setData({
      currentVideoIndex: targetIndex
    });
    
    // 如果是向上滑动且已预加载了下一个视频
    if (direction === 'up' && this.data.nextVideo && this.data.nextVideo.objectId === targetVideo.objectId) {
      // 设置过渡动画 - 向上滑动到下一个视频
      const translateY = -this.data.videoContainerHeight * 2; // 滑动到下一个视频位置
      const videoContainerStyle = `transform: translateY(${translateY}px); transition: transform 0.3s ease`;
      
      this.setData({
        videoContainerStyle,
        nextVideoVisible: true
      });
      
      // 300ms后切换视频
      this.data.animationTimer = setTimeout(() => {
        // 将新视频ID添加到已浏览列表
        const viewedVideoIds = [...this.data.viewedVideoIds];
        if (!viewedVideoIds.includes(targetVideo.objectId)) {
          viewedVideoIds.push(targetVideo.objectId);
        }
        
        // 更新当前视频
        this.setData({
          note: {
            ...this.data.nextVideo,
            createTime: formatTime(this.data.nextVideo.createdAt)
          },
          viewedVideoIds,
          videoContainerStyle: `transform: translateY(${-this.data.videoContainerHeight}px)`,
          isSwitching: false,
          direction: '',
          progress: 0,
          isExpanded: false
        });
        
        // 播放新视频
        this.currentVideoContext = this.nextVideoContext;
        this.currentVideoContext.play();
        
        // 预加载新的上下个视频
        this.preloadVideos();
      }, 300);
    } 
    // 如果是向下滑动且已预加载了上一个视频
    else if (direction === 'down' && this.data.prevVideo && this.data.prevVideo.objectId === targetVideo.objectId) {
      // 设置过渡动画 - 向下滑动到上一个视频
      const translateY = 0; // 滑动到上一个视频位置
      const videoContainerStyle = `transform: translateY(${translateY}px); transition: transform 0.3s ease`;
      
      this.setData({
        videoContainerStyle,
        prevVideoVisible: true
      });
      
      // 300ms后切换视频
      this.data.animationTimer = setTimeout(() => {
        // 将新视频ID添加到已浏览列表
        const viewedVideoIds = [...this.data.viewedVideoIds];
        if (!viewedVideoIds.includes(targetVideo.objectId)) {
          viewedVideoIds.push(targetVideo.objectId);
        }
        
        // 更新当前视频
        this.setData({
          note: {
            ...this.data.prevVideo,
            createTime: formatTime(this.data.prevVideo.createdAt)
          },
          viewedVideoIds,
          videoContainerStyle: `transform: translateY(${-this.data.videoContainerHeight}px)`,
          isSwitching: false,
          direction: '',
          progress: 0,
          isExpanded: false
        });
        
        // 播放新视频
        this.currentVideoContext = this.prevVideoContext;
        this.currentVideoContext.play();
        
        // 预加载新的上下个视频
        this.preloadVideos();
      }, 300);
    }
    // 如果没有预加载或预加载的不是目标视频，则正常加载
    else {
      // 设置过渡动画
      const translateY = direction === 'up' ? 
        -this.data.videoContainerHeight * 2 : // 向上滑动到下一个视频
        0; // 向下滑动到上一个视频
      const videoContainerStyle = `transform: translateY(${translateY}px); transition: transform 0.3s ease`;
      
      this.setData({
        videoContainerStyle
      });
      
      // 300ms后加载新视频
      this.data.animationTimer = setTimeout(() => {
        // 加载新视频数据
        this.loadNoteData(targetVideo.objectId).then(() => {
          // 将新视频ID添加到已浏览列表
          const viewedVideoIds = [...this.data.viewedVideoIds];
          if (!viewedVideoIds.includes(targetVideo.objectId)) {
            viewedVideoIds.push(targetVideo.objectId);
          }
          
          // 重置动画状态
          this.setData({
            viewedVideoIds,
            videoContainerStyle: `transform: translateY(${-this.data.videoContainerHeight}px)`,
            isSwitching: false,
            direction: '',
            progress: 0,
            isExpanded: false
          });
          
          // 播放新视频
          this.currentVideoContext = wx.createVideoContext('currentVideo');
          this.currentVideoContext.play();
          
          // 预加载新的上下个视频
          this.preloadVideos();
        });
      }, 300);
    }
  },

  // 切换到指定索引的视频（不带动画，用于直接跳转）
  switchVideo(index) {
    if (this.data.isSwitching) return;
    
    this.setData({
      isSwitching: true,
      videoAnimationClass: 'scale-out' // 当前视频缩小淡出
    });
    
    // 暂停当前视频
    if (this.currentVideoContext) {
      this.currentVideoContext.pause();
    }
    
    const targetVideo = this.data.videoList[index];
    if (!targetVideo) {
      this.setData({
        isSwitching: false,
        videoAnimationClass: ''
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
        videoAnimationClass: 'scale-in', // 新视频放大淡入
        isSwitching: false,
        progress: 0,
        isExpanded: false
      });
      
      // 播放新视频
      this.currentVideoContext = wx.createVideoContext('currentVideo');
      this.currentVideoContext.play();
      
      // 500ms后清除动画类
      setTimeout(() => {
        this.setData({
          videoAnimationClass: ''
        });
      }, 500);
    });
  },

  // ... existing code ...
}); 