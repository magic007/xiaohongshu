Page({
  data: {
    currentTab: 1, // 默认显示收藏tab
    userInfo: {
      nickname: '',
      userId: '',
      avatar: '',
      bio: '',
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

  getCurrentUser() {
    const current = wx.Bmob.User.current();
    if (current) {
      this.setData({
        'userInfo.nickname': current.nickname || '未设置昵称',
        'userInfo.userId': current.objectId || '',
        'userInfo.bio': current.signature || '还没有简介',
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
    const query = wx.Bmob.Query('Note');
    query.equalTo('author', '==', userId);
    query.include('author'); // 包含作者信息
    query.order('-createdAt'); // 按创建时间降序
    query.find().then(res => {
      const notes = res.map(note => ({
        id: note.objectId,
        image: note.images ? note.images[0] : '',
        title: note.content,
        author: {
          avatar: note.author.avatar || '',
          nickname: note.author.nickname
        },
        likes: note.likeCount || 0
      }));
      this.setData({
        noteList: notes
      });
    });
  },

  // 获取用户的收藏
  getUserCollections(userId) {
    const query = wx.Bmob.Query('Favorite');
    query.equalTo('user', '==', userId);
    query.include('note', 'note.author'); // 包含笔记和作者信息
    query.order('-createdAt');
    query.find().then(res => {
      const collections = res.map(favorite => ({
        id: favorite.note.objectId,
        image: favorite.note.images ? favorite.note.images[0] : '',
        title: favorite.note.content,
        author: {
          avatar: favorite.note.author.avatar || '',
          nickname: favorite.note.author.nickname
        },
        likes: favorite.note.likeCount || 0
      }));
      this.setData({
        collectionList: collections
      });
    });
  },

  // 获取用户的点赞
  getUserLikes(userId) {
    const query = wx.Bmob.Query('Like');
    query.equalTo('user', '==', userId);
    query.include('note', 'note.author'); // 包含笔记和作者信息
    query.order('-createdAt');
    query.find().then(res => {
      const likes = res.map(like => ({
        id: like.note.objectId,
        image: like.note.images ? like.note.images[0] : '',
        title: like.note.content,
        author: {
          avatar: like.note.author.avatar || '',
          nickname: like.note.author.nickname
        },
        likes: like.note.likeCount || 0
      }));
      this.setData({
        likedList: likes
      });
    });
  },

  switchTab(e) {
    const index = e.currentTarget.dataset.index;
    if (this.data.currentTab == index) return; // 避免重复切换
    this.setData({
      currentTab: index
    });
  }
}) 