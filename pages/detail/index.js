// pages/detail/index.js
const app = getApp()

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
    isFollowing: false,
    isLiked: false,
    isFavorited: false,
    currentPage: 1,
    pageSize: 10,
    hasMore: true
  },

  onLoad: function(options) {
    console.log('页面加载参数:', options)
    const noteId = options.id
    this.setData({
      'noteData.objectId': noteId
    })
    this.fetchNoteDetail()
    this.fetchComments()
    this.checkUserInteraction()
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
          likeCount: note.likeCount || 0,
          favoriteCount: note.favoriteCount || 0,
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
      likeQuery.equalTo("note","==", noteObject)
      likeQuery.equalTo("user", "==", userPointer.set(currentUser.objectId))

      const likeResult = await likeQuery.find()
      
      // 检查是否收藏
      const favoriteQuery = new wx.Bmob.Query('favorite')
      const favoriteObject = notePointer.set(this.data.noteData.objectId)
      favoriteQuery.equalTo("note","==", favoriteObject)
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

  // 获取评论列表
  async fetchComments() {
    if (!this.data.hasMore) return
    
    try {
      const query = new wx.Bmob.Query('comment')
      const notePointer = wx.Bmob.Pointer('note')
      const noteObject = notePointer.set(this.data.noteData.objectId)
      query.equalTo('note', "==", noteObject)
      query.equalTo('status', 1) // 只查询已发布的评论
      query.equalTo('level', 1) // 只查询一级评论
      query.limit(this.data.pageSize)
      query.skip((this.data.currentPage - 1) * this.data.pageSize)
      query.include('author') // 关联查询评论作者信息
      query.descending('createdAt')
      
      const comments = await query.find()
      
      // 处理评论数据
      const formattedComments = comments.map(comment => ({
        id: comment.objectId,
        content: comment.content,
        createTime: comment.createdAt.split(' ')[0],
        likeCount: comment.likeCount || 0,
        userInfo: {
          objectId: comment.author.objectId,
          avatar: comment.author.avatar,
          nickname: comment.author.nickname
        }
      }))
      
      this.setData({
        comments: [...this.data.comments, ...formattedComments],
        currentPage: this.data.currentPage + 1,
        hasMore: comments.length === this.data.pageSize
      })
    } catch (error) {
      wx.showToast({
        title: '获取评论失败',
        icon: 'none'
      })
    }
  },

  // 关注/取消关注
  async handleFollow() {
    if (!wx.Bmob.User.current()) {
      wx.navigateTo({
        url: '/pages/login/index'
      })
      return
    }

    try {
      if (this.data.isFollowing) {
        // 取消关注
        const query = new wx.Bmob.Query('follow')
        const pointer = wx.Bmob.Pointer('_User')
        const poiID = pointer.set(wx.Bmob.User.current().objectId)
        query.equalTo('follower', "==", poiID)
        const poiID2 = pointer.set(this.data.noteData.userInfo.objectId)
        query.equalTo('following', "==", poiID2)
        const followResult = await query.find()
        if (followResult.length > 0) {
          await followResult[0].destroy()
        }
      } else {
        // 添加关注
        const follow = wx.Bmob.Query('follow')
        const pointer = wx.Bmob.Pointer('_User')
        const poiID = pointer.set(wx.Bmob.User.current().objectId)
        follow.set('follower', poiID)
        const poiID2 = pointer.set(this.data.noteData.userInfo.objectId)
        follow.set('following', poiID2)
        follow.set('status', 1)
        await follow.save()
      }

      this.setData({
        isFollowing: !this.data.isFollowing
      })

      wx.showToast({
        title: this.data.isFollowing ? '关注成功' : '已取消关注',
        icon: 'success'
      })
    } catch (error) {
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
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

  // 处理评论事件
  handleComment() {
    if (!wx.Bmob.User.current()) {
      wx.navigateTo({
        url: '/pages/login/index'
      })
      return
    }

    wx.showToast({
      title: '评论功能开发中',
      icon: 'none'
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