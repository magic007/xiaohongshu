// pages/detail/index.js
const app = getApp()
const Bmob = app.globalData.Bmob

// 格式化评论时间
function formatCommentTime(dateString) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  
  // 获取当前日期
  const now = new Date();
  const currentYear = now.getFullYear();
  const commentYear = date.getFullYear();
  
  // 如果是当年的评论，只显示月-日，否则显示年-月-日
  if (commentYear === currentYear) {
    return `${month}-${day}`;
  } else {
    return `${commentYear}-${month}-${day}`;
  }
}

Page({
  data: {
    noteData: {
      objectId: '',
      title: '',
      content: '',
      images: [],
      tags: [],
      location: '',
      createTime: '',
      likeCount: 0,
      favoriteCount: 0,
      commentCount: 0,
      userInfo: {
        objectId: '',
        avatar: '',
        nickname: '小番薯'
      }
    },
    comments: [],
    commentText: '',
    isFollowing: false,
    isLiked: false,
    isFavorited: false,
    currentPage: 1,
    pageSize: 10,
    hasMore: true,
    isLoading: false,
    isRefreshing: false,
    focusComment: false
  },

  onLoad: function(options) {
    console.log('页面加载参数:', options)
    const noteId = options.id
    this.setData({
      'noteData.objectId': noteId
    })
    this.fetchNoteDetail()
    this.checkUserInteraction()
    this.fetchComments(true) // 初始加载评论
  },

  // 获取笔记详情
  async fetchNoteDetail() {
    try {
      console.log('开始获取笔记详情, ID:', this.data.noteData.objectId)
      
      const query = new wx.Bmob.Query('note')
      query.include('author','category')
      
      console.log('执行查询前...')
      const note = await query.get(this.data.noteData.objectId)
      console.log('获取到的原始笔记数据:', note)
      
      // 查询点赞数量
      const likeQuery = new wx.Bmob.Query('like')
      const notePointer = wx.Bmob.Pointer('note')
      likeQuery.equalTo('note', "==", notePointer.set(this.data.noteData.objectId))
      const likeCount = await likeQuery.count() // 获取点赞数量

      // 查询收藏数量
      const favoriteQuery = new wx.Bmob.Query('favorite')
      favoriteQuery.equalTo('note', "==", notePointer.set(this.data.noteData.objectId))
      const favoriteCount = await favoriteQuery.count() // 获取收藏数量

      // 检查是否已关注
      const currentUser = wx.Bmob.User.current()
      let isFollowing = false
      
      if (currentUser && note.author) {
        const followQuery = new wx.Bmob.Query('follow')
        const pointer = wx.Bmob.Pointer('_User')
        const poiID = pointer.set(currentUser.objectId)
        followQuery.equalTo('follower', "==", poiID)
        const poiID2 = pointer.set(note.author.objectId)
        followQuery.equalTo('following', "==", poiID2)
        const followResult = await followQuery.find()
        isFollowing = followResult.length > 0
      }
      
      // 更新数据
      const updateData = {
        noteData: {
          objectId: note.objectId,
          title: note.title || '',
          content: note.content || '',
          images: note.images || [],
          tags: note.tags || [],
          location: note.location || '',
          createTime: note.createdAt.split(' ')[0],
          likeCount: likeCount, // 设置点赞数量
          favoriteCount: favoriteCount, // 设置收藏数量
          commentCount: note.commentCount || 0,
          userInfo: note.author ? {
            objectId: note.author.objectId,
            avatar: note.author.avatar,
            nickname: note.author.nickname
          } : {
            objectId: '',
            avatar: '',
            nickname: '小番薯'
          }
        },
        isFollowing
      }
      
      console.log('准备更新的数据:', updateData)
      
      this.setData(updateData)
      console.log('数据更新完成')
      
    } catch (error) {
      console.error('获取笔记详情失败，详细错误信息:', error)
      console.error('错误信息:', error.message)
      wx.showToast({
        title: '获取笔记详情失败',
        icon: 'none'
      })
    }
  },

  // 检查用户是否点赞和收藏
  async checkUserInteraction() {
    const currentUser = wx.Bmob.User.current()
    if (!currentUser) return

    try {
      // 检查是否点赞
      const likeQuery = new wx.Bmob.Query('like')
      const notePointer = wx.Bmob.Pointer('note')
      const userPointer = wx.Bmob.Pointer('_User')
      const noteObject = notePointer.set(this.data.noteData.objectId)
      likeQuery.equalTo("note", "==", noteObject)
      likeQuery.equalTo("user", "==", userPointer.set(currentUser.objectId))

      const likeResult = await likeQuery.find()
      
      // 检查是否收藏
      const favoriteQuery = new wx.Bmob.Query('favorite')
      const favoriteObject = notePointer.set(this.data.noteData.objectId)
      favoriteQuery.equalTo("note", "==", favoriteObject)
      favoriteQuery.equalTo("user", "==", userPointer.set(currentUser.objectId))

      const favoriteResult = await favoriteQuery.find()

      this.setData({
        isLiked: likeResult.length > 0,
        isFavorited: favoriteResult.length > 0
      })
    } catch (error) {
      console.error('检查用户交互状态失败:', error)
    }
  },

  // 处理评论按钮点击
  handleComment() {
    // 检查是否登录
    const current = wx.Bmob.User.current()
    if (!current) {
      wx.navigateTo({
        url: '/pages/login/index',
      })
      return
    }
    
    // 设置焦点到评论框并滚动到页面底部
    wx.pageScrollTo({
      selector: '.comment-input',
      duration: 300
    })
    
    this.setData({
      focusComment: true
    })
  },

  // 下拉刷新评论
  onRefresh() {
    this.setData({ 
      isRefreshing: true,
      comments: [],
      currentPage: 1,
      hasMore: true
    })
    this.fetchComments(true)
  },

  // 获取评论列表
  async fetchComments(isRefresh = false) {
    if ((!this.data.hasMore && !isRefresh) || this.data.isLoading) return
    
    this.setData({ isLoading: true })
    
    try {
      const query = new wx.Bmob.Query('comment')
      const notePointer = wx.Bmob.Pointer('note')
      const noteObject = notePointer.set(this.data.noteData.objectId)
      query.equalTo('note', "==", noteObject)
      query.equalTo('status', "==", 1) // 只查询已发布的评论
      query.equalTo('level', "==", 1) // 只查询一级评论
      query.limit(this.data.pageSize)
      query.skip((this.data.currentPage - 1) * this.data.pageSize)
      query.include('user', 'author') // 关联查询评论作者信息
      query.order('-createdAt')
      
      const comments = await query.find()
      
      // 处理评论数据
      const formattedComments = comments.map(comment => {
        // 优先使用author字段，如果不存在则使用user字段
        const userInfo = comment.author || comment.user || {};
        
        // 随机生成地区信息，模拟小红书评论样式
        const locations = ['上海', '北京', '广州', '深圳', '杭州', '成都', '重庆', '南京', '武汉', '西安', '天津', '苏州', '厦门', '长沙', '青岛'];
        const randomLocation = locations[Math.floor(Math.random() * locations.length)];
        
        return {
          id: comment.objectId,
          content: comment.content,
          createTime: formatCommentTime(comment.createdAt) + ' ' + randomLocation,
          likeCount: comment.likeCount || 0,
          userInfo: {
            objectId: userInfo.objectId || '',
            avatar: userInfo.avatar || '',
            nickname: userInfo.nickname || '用户' + comment.objectId.substr(0, 4)
          }
        }
      })
      
      this.setData({
        comments: isRefresh ? formattedComments : [...this.data.comments, ...formattedComments],
        currentPage: this.data.currentPage + 1,
        hasMore: comments.length === this.data.pageSize,
        isLoading: false,
        isRefreshing: false
      })
    } catch (error) {
      console.error('获取评论失败:', error)
      this.setData({ 
        isLoading: false,
        isRefreshing: false
      })
      wx.showToast({
        title: '获取评论失败',
        icon: 'none'
      })
    }
  },

  // 加载更多评论
  loadMoreComments() {
    if (this.data.hasMore && !this.data.isLoading) {
      this.fetchComments()
    }
  },

  // 监听评论输入
  onCommentInput(e) {
    this.setData({
      commentText: e.detail.value
    })
  },

  // 提交评论
  async submitComment() {
    if (!this.data.commentText.trim()) {
      wx.showToast({
        title: '请输入评论内容',
        icon: 'none'
      })
      return
    }

    const current = wx.Bmob.User.current()
    if (!current) {
      wx.navigateTo({
        url: '/pages/login/index'
      })
      return
    }

    try {
      // 创建评论
      const comment = wx.Bmob.Query('comment')
      const notePointer = wx.Bmob.Pointer('note')
      const userPointer = wx.Bmob.Pointer('_User')
      
      comment.set('content', this.data.commentText.trim())
      comment.set('note', notePointer.set(this.data.noteData.objectId))
      comment.set('user', userPointer.set(current.objectId))
      comment.set('author', userPointer.set(current.objectId)) // 添加author字段
      comment.set('status', 1) // 1表示正常状态
      comment.set('level', 1)  // 1级评论
      
      const result = await comment.save()
      console.log('评论保存成功:', result)

      // 更新笔记评论数
      const noteQuery = wx.Bmob.Query('note')
      const note = await noteQuery.get(this.data.noteData.objectId)
      note.increment('commentCount')
      await note.save()
      
      // 更新本地评论数
      this.setData({
        'noteData.commentCount': (this.data.noteData.commentCount || 0) + 1,
        commentText: '',
        focusComment: false, // 取消输入框焦点
        comments: [], // 清空评论列表
        currentPage: 1, // 重置页码
        hasMore: true // 重置加载状态
      })

      // 重新加载评论列表
      this.fetchComments()

      wx.showToast({
        title: '评论成功',
        icon: 'success'
      })
    } catch (error) {
      console.error('提交评论失败:', error)
      wx.showToast({
        title: '评论失败，请重试',
        icon: 'none'
      })
    }
  },

  // 处理关注按钮组件的事件
  handleFollowChange(e) {
    const { isFollowing } = e.detail;
    
    // 更新页面状态
    this.setData({
      isFollowing: isFollowing
    });
  },

  // 原来的关注方法，保留作为备用
  async handleFollow() {
    // 调用新的方法，传递当前状态的反向值和用户ID
    this.handleFollowChange({
      detail: {
        isFollowing: !this.data.isFollowing,
        userId: this.data.noteData.userInfo.objectId
      }
    });
  },

  // 处理点赞事件
  handleLike(e) {
    if (!wx.Bmob.User.current()) {
      wx.navigateTo({
        url: '/pages/login/index'
      })
      return
    }

    this.setData({
      isLiked: e.detail.isLiked,
      'noteData.likeCount': e.detail.likeCount
    })
  },

  // 处理收藏事件
  handleFavorite(e) {
    if (!wx.Bmob.User.current()) {
      wx.navigateTo({
        url: '/pages/login/index'
      })
      return
    }

    this.setData({
      isFavorited: e.detail.isFavorited,
      'noteData.favoriteCount': e.detail.favoriteCount
    })
  },

  // 处理分享事件
  handleShare() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
  },

  // 分享给朋友
  onShareAppMessage() {
    return {
      title: this.data.noteData.content.substring(0, 20) + '...',
      path: '/pages/detail/index?id=' + this.data.noteData.objectId,
      imageUrl: this.data.noteData.images[0]
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: this.data.noteData.content.substring(0, 20) + '...',
      query: 'id=' + this.data.noteData.objectId,
      imageUrl: this.data.noteData.images[0]
    }
  }
})