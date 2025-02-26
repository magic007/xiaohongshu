// pages/detail/index.js
const app = getApp()

Page({
  data: {
    noteData: {
      id: '',
      title: '',
      content: '',
      images: [],
      tags: [],
      location: '',
      createTime: '',
      displayTime: '',
      likeCount: 0,
      starCount: 0,
      commentCount: 0,
      userInfo: {
        objectId: '',
        avatar: '',
        nickname: '小番薯'
      }
    },
    comments: [],
    isFollowing: false,
    currentPage: 1,
    pageSize: 10,
    hasMore: true
  },

  // 格式化时间显示
  formatTime(dateString) {
    const now = new Date()
    const date = new Date(dateString)
    const diff = now - date

    // 计算时间差
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 1) {
      return '刚刚'
    } else if (minutes < 60) {
      return `${minutes}分钟前`
    } else if (hours < 24) {
      return `${hours}小时前`
    } else if (days < 30) {
      return `${days}天前`
    } else {
      const year = date.getFullYear()
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const day = date.getDate().toString().padStart(2, '0')
      return `${year}-${month}-${day}`
    }
  },

  onLoad: function(options) {
    console.log('页面加载参数:', options)
    const noteId = options.id
    this.setData({
      'noteData.id': noteId
    })
    this.fetchNoteDetail()
    this.fetchComments()
  },

  // 获取笔记详情
  async fetchNoteDetail() {
    try {
      console.log('开始获取笔记详情, ID:', this.data.noteData.id)
      
      const query = new wx.Bmob.Query('note')
      query.include('author','category')
      
      console.log('执行查询前...')
      const note = await query.get(this.data.noteData.id)
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
          id: note.objectId,
          title: note.title || '',
          content: note.content || '',
          images: note.images || [],
          tags: note.tags || [],
          location: note.location || '',
          createTime: note.createdAt,
          displayTime: this.formatTime(note.createdAt),
          likeCount: note.likeCount || 0,
          starCount: note.favoriteCount || 0,
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

  // 获取评论列表
  async fetchComments() {
    if (!this.data.hasMore) return
    
    try {
      const query = new wx.Bmob.Query('comment')
      query.equalTo('note', this.data.noteData.id)
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
          const follow = wx.Bmob.Query('follow');
          await follow.destroy(followResult[0].objectId);
        }
      } else {
        // 添加关注
        const followerId = wx.Bmob.User.current().objectId;
        const followingId = this.data.noteData.userInfo.objectId;
        console.log('followerId:', followerId);
        console.log('followingId:', followingId);
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

  // 点赞笔记
  async handleLike() {
    if (!wx.Bmob.User.current()) {
      wx.navigateTo({
        url: '/pages/login/index'
      })
      return
    }

    try {
      const query = new wx.Bmob.Query('like')
      query.equalTo('user', wx.Bmob.User.current().objectId)
      query.equalTo('note', this.data.noteData.id)
      const like = await query.first()

      if (like) {
        // 取消点赞
        await like.destroy()
        this.setData({
          'noteData.likeCount': this.data.noteData.likeCount - 1
        })
      } else {
        // 添加点赞
        const Like = wx.Bmob.Object.extend('like')
        const newLike = new Like()
        newLike.set('user', wx.Bmob.User.current().objectId)
        newLike.set('note', this.data.noteData.id)
        await newLike.save()
        this.setData({
          'noteData.likeCount': this.data.noteData.likeCount + 1
        })
      }
    } catch (error) {
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  },

  // 收藏笔记
  async handleStar() {
    if (!wx.Bmob.User.current()) {
      wx.navigateTo({
        url: '/pages/login/index'
      })
      return
    }

    try {
      const query = new wx.Bmob.Query('favorite')
      query.equalTo('user', wx.Bmob.User.current().objectId)
      query.equalTo('note', this.data.noteData.id)
      const favorite = await query.first()

      if (favorite) {
        // 取消收藏
        await favorite.destroy()
        this.setData({
          'noteData.starCount': this.data.noteData.starCount - 1
        })
      } else {
        // 添加收藏
        const Favorite = wx.Bmob.Object.extend('favorite')
        const newFavorite = new Favorite()
        newFavorite.set('user', wx.Bmob.User.current().objectId)
        newFavorite.set('note', this.data.noteData.id)
        newFavorite.set('status', 1) // 1表示公开
        await newFavorite.save()
        this.setData({
          'noteData.starCount': this.data.noteData.starCount + 1
        })
      }
    } catch (error) {
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  },

  // 分享
  handleShare() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
  },

  // 显示评论输入框
  showCommentInput() {
    if (!wx.Bmob.User.current()) {
      wx.navigateTo({
        url: '/pages/login/index'
      })
      return
    }

    wx.navigateTo({
      url: `/pages/comment/index?noteId=${this.data.noteData.id}`
    })
  },

  // 点赞评论
  async handleCommentLike(e) {
    if (!wx.Bmob.User.current()) {
      wx.navigateTo({
        url: '/pages/login/index'
      })
      return
    }

    const commentId = e.currentTarget.dataset.id
    try {
      const query = new wx.Bmob.Query('like')
      query.equalTo('user', wx.Bmob.User.current().objectId)
      query.equalTo('comment', commentId)
      const like = await query.first()

      if (like) {
        // 取消点赞
        await like.destroy()
        this.setData({
          comments: this.data.comments.map(comment => {
            if (comment.id === commentId) {
              return {
                ...comment,
                likeCount: comment.likeCount - 1
              }
            }
            return comment
          })
        })
      } else {
        // 添加点赞
        const Like = wx.Bmob.Object.extend('like')
        const newLike = new Like()
        newLike.set('user', wx.Bmob.User.current().objectId)
        newLike.set('comment', commentId)
        await newLike.save()
        this.setData({
          comments: this.data.comments.map(comment => {
            if (comment.id === commentId) {
              return {
                ...comment,
                likeCount: comment.likeCount + 1
              }
            }
            return comment
          })
        })
      }
    } catch (error) {
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  },

  onReachBottom: function() {
    this.fetchComments()
  },

  onShareAppMessage: function() {
    return {
      title: this.data.noteData.title,
      path: `/pages/detail/index?id=${this.data.noteData.id}`
    }
  },

  onShareTimeline: function() {
    return {
      title: this.data.noteData.title,
      query: `id=${this.data.noteData.id}`
    }
  }
})