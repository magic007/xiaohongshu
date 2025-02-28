Page({
  data: {
    currentTab: 0,
    userInfo: {
      avatar: '',
      nickname: '用户昵称',
      userId: '123456',
      bio: '这是个人简介',
      stats: {
        following: 0,
        followers: 0,
        likes: 0
      }
    },
    // 笔记列表
    noteList: [],
    // 收藏列表
    collectionList: [],
    // 赞过列表
    likedList: []
  },

  onLoad() {
    this.getCurrentUser();
  },

  onShow() {
    // 每次页面显示时刷新数据
    if (wx.Bmob.User.current()) {
      this.getCurrentUser();
    }
  },

  // 处理笔记点击
  onTapNote(e) {
    const note = e.currentTarget.dataset.note;
    // 根据笔记类型跳转到不同页面
    const url = note.video 
      ? `/pages/video-detail/index?id=${note.id}`
      : `/pages/detail/index?id=${note.id}`;
    
    wx.navigateTo({ url });
  },

  // 处理点赞
  onLikeNote(e) {
    const { note } = e.detail;
    // TODO: 实现点赞逻辑
    wx.showToast({
      title: '点赞成功',
      icon: 'success'
    });
  },

  getCurrentUser() {
    const current = wx.Bmob.User.current();
    if (current) {
      this.setData({
        'userInfo.nickname': current.nickname || '未设置昵称',
        'userInfo.userId': current.objectId || '',
        'userInfo.bio': current.signature || '还没有简介',
        'userInfo.avatar': current.avatar || '',
        'userInfo.stats.following': current.followCount || 0,
        'userInfo.stats.followers': current.fansCount || 0,
        'userInfo.stats.likes': current.likeCollectCount || 0
      });
      // 获取用户的笔记、收藏和点赞数据
      this.getUserNotes(current.objectId);
      this.getUserCollections(current.objectId);
      this.getUserLikes(current.objectId);
    } else {
      wx.navigateTo({
        url: '/pages/login/login'
      });
    }
  },

  // 获取用户的笔记
  getUserNotes(userId) {
    const query = wx.Bmob.Query('note');
    const pointer = wx.Bmob.Pointer('_User');
    const pointerObject = pointer.set(userId);
    query.equalTo('author', '==', pointerObject);
    query.include('author');
    query.order('-createdAt');
    query.find().then(res => {
      const notes = res.map(note => ({
        id: note.objectId,
        title: note.content,
        content: note.content,
        video: note.video || '',
        type: note.video ? 'video' : 'image',
        author: {
          avatar: note.author.avatar || '',
          nickname: note.author.nickname
        },
        likes: note.likeCount || 0
      }));
      this.setData({
        noteList: notes
      });
    }).catch(err => {
      console.error('获取笔记失败：', err);
    });
  },

  // 获取用户的收藏
  getUserCollections(userId) {
    const query = wx.Bmob.Query('favorite');
    const pointer = wx.Bmob.Pointer('_User');
    const pointerObject = pointer.set(userId);
    query.equalTo('user', '==', pointerObject);
    query.include('note', 'note.author');
    query.find().then(favorites => {
      const collections = favorites.map(fav => {
        const note = fav.note;
        return {
          id: note.objectId,
          title: note.content,
          content: note.content,
          video: note.video || '',
          type: note.video ? 'video' : 'image',
          author: {
            avatar: note.author ? note.author.avatar || '' : '',
            nickname: note.author ? note.author.nickname || '未知用户' : '未知用户'
          },
          likes: note.likeCount || 0
        };
      });
      this.setData({
        collectionList: collections
      });
    }).catch(err => {
      console.error('获取收藏失败：', err);
    });
  },

  // 获取用户的点赞
  getUserLikes(userId) {
    const query = wx.Bmob.Query('like');
    const pointer = wx.Bmob.Pointer('_User');
    const pointerObject = pointer.set(userId);
    query.equalTo('user', '==', pointerObject);
    query.include('note', 'note.author');
    query.find().then(likes => {
      const likedNotes = likes.map(like => {
        const note = like.note;
        return {
          id: note.objectId,
          title: note.content,
          content: note.content,
          video: note.video || '',
          type: note.video ? 'video' : 'image',
          author: {
            avatar: note.author ? note.author.avatar || '' : '',
            nickname: note.author ? note.author.nickname || '未知用户' : '未知用户'
          },
          likes: note.likeCount || 0
        };
      });
      this.setData({
        likedList: likedNotes
      });
    }).catch(err => {
      console.error('获取点赞失败：', err);
    });
  },

  switchTab(e) {
    const index = e.currentTarget.dataset.index;
    if (this.data.currentTab === index) return;
    this.setData({
      currentTab: index
    });
  },

  goToSettings() {
    wx.navigateTo({
      url: '/pages/settings/index'
    });
  }
}) 