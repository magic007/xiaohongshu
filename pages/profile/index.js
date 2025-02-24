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
    const query = wx.Bmob.Query('note');
    // 创建 Pointer 对象
    const pointer = wx.Bmob.Pointer('_User');
    const pointerObject = pointer.set(userId);
    query.equalTo('author', '==', pointerObject);
    query.include('author');
    query.order('-createdAt');
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
    const query = wx.Bmob.Query('favorite');
    // 创建 Pointer 对象
    const pointer = wx.Bmob.Pointer('_User');
    const pointerObject = pointer.set(userId);
    query.equalTo('user', '==', pointerObject);
    // 先只查询收藏记录
    query.find().then(favorites => {
      if (favorites.length === 0) {
        this.setData({ collectionList: [] });
        return;
      }

      // 再查询关联的笔记
      const noteQuery = wx.Bmob.Query('note');
      const noteIds = favorites.map(fav => fav.note.objectId);
      noteQuery.containedIn('objectId', noteIds);
      noteQuery.include('author');
      noteQuery.find().then(notes => {
        // 将笔记数据与收藏记录匹配
        const collections = favorites.map(favorite => {
          const note = notes.find(n => n.objectId === favorite.note.objectId);
          if (!note) return null;
          return {
            id: note.objectId,
            image: note.images ? note.images[0] : '',
            title: note.content,
            author: {
              avatar: note.author ? note.author.avatar || '' : '',
              nickname: note.author ? note.author.nickname || '未知用户' : '未知用户'
            },
            likes: note.likeCount || 0
          };
        }).filter(Boolean);

        this.setData({
          collectionList: collections
        });
      });
    });
  },

  // 获取用户的点赞
  getUserLikes(userId) {
    const query = wx.Bmob.Query('like');
    // 创建 Pointer 对象
    const pointer = wx.Bmob.Pointer('_User');
    const pointerObject = pointer.set(userId);
    query.equalTo('user', '==', pointerObject);
    // 先查询点赞记录
    query.find().then(likes => {
      if (likes.length === 0) {
        this.setData({ likedList: [] });
        return;
      }

      // 再查询关联的笔记
      const noteQuery = wx.Bmob.Query('note');
      const noteIds = likes.map(like => like.note.objectId);
      noteQuery.containedIn('objectId', noteIds);
      noteQuery.include('author');
      noteQuery.find().then(notes => {
        // 将笔记数据与点赞记录匹配
        const likedNotes = likes.map(like => {
          const note = notes.find(n => n.objectId === like.note.objectId);
          if (!note) return null;
          return {
            id: note.objectId,
            image: note.images ? note.images[0] : '',
            title: note.content,
            author: {
              avatar: note.author ? note.author.avatar || '' : '',
              nickname: note.author ? note.author.nickname || '未知用户' : '未知用户'
            },
            likes: note.likeCount || 0
          };
        }).filter(Boolean);

        this.setData({
          likedList: likedNotes
        });
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