// index.js
const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

Page({
  data: {
    motto: 'Hello World ',
    userInfo: {
      avatarUrl: defaultAvatarUrl,
      nickName: '',
    },
    hasUserInfo: false,
    canIUseGetUserProfile: wx.canIUse('getUserProfile'),
    canIUseNicknameComp: wx.canIUse('input.type.nickname'),
    currentTab: 0,
    statusBarHeight: 20,
    navHeight: 44,
    pageNum: 1,
    pageSize: 10,
    hasMore: true,
    isRefreshing: false,
    categories: [],
    contentList: []
  },
  bindViewTap() {
    wx.navigateTo({
      url: '../logs/logs'
    })
  },
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    const { nickName } = this.data.userInfo
    this.setData({
      "userInfo.avatarUrl": avatarUrl,
      hasUserInfo: nickName && avatarUrl && avatarUrl !== defaultAvatarUrl,
    })
  },
  onInputChange(e) {
    const nickName = e.detail.value
    const { avatarUrl } = this.data.userInfo
    this.setData({
      "userInfo.nickName": nickName,
      hasUserInfo: nickName && avatarUrl && avatarUrl !== defaultAvatarUrl,
    })
  },
  getUserProfile(e) {
    // 推荐使用wx.getUserProfile获取用户信息，开发者每次通过该接口获取用户个人信息均需用户确认，开发者妥善保管用户快速填写的头像昵称，避免重复弹窗
    wx.getUserProfile({
      desc: '展示用户信息', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
      success: (res) => {
        console.log(res)
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        })
      }
    })
  },
  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/detail/index?id=${id}`
    });
  },
  onLoad() {
    // 获取状态栏高度
    const systemInfo = wx.getSystemInfoSync();
    const statusBarHeight = systemInfo.statusBarHeight-3;
    const navHeight = statusBarHeight + 48;

    this.setData({
      statusBarHeight,
      navHeight
    });

    // 加载分类数据
    this.loadCategories();
  },
  // 加载分类数据
  async loadCategories() {
    const query = wx.Bmob.Query("category");
    query.order("sort");
    try {
      const categories = await query.find();
      // 添加"推荐"分类
      const allCategories = [{
        objectId: 'all',
        name: '推荐'
      }, ...categories];
      
      this.setData({
        categories: allCategories
      });
      // 加载初始数据
      this.loadInitialData();
    } catch (error) {
      console.error('加载分类失败:', error);
      wx.showToast({
        title: '加载分类失败',
        icon: 'none'
      });
    }
  },
  // 加载初始数据
  async loadInitialData() {
    const query = this.getNotesQuery();
    query.limit(this.data.pageSize);
    query.skip(0);
    
    try {
      const notes = await query.find();
      this.setData({
        contentList: this.formatNotes(notes),
        pageNum: 1,
        hasMore: notes.length === this.data.pageSize
      });
    } catch (error) {
      console.error('加载数据失败:', error);
      wx.showToast({
        title: '加载数据失败',
        icon: 'none'
      });
    }
  },
  // 构建笔记查询对象
  getNotesQuery() {
    const query = wx.Bmob.Query("note");
    query.order("-createdAt");
    query.include("author");
    
    // 如果不是"推荐"分类，添加分类过滤
    if (this.data.currentTab > 0) {
      const categoryId = this.data.categories[this.data.currentTab].objectId;
      const pointer = wx.Bmob.Pointer("category");
      const pointerObject = pointer.set(categoryId);
      query.equalTo("category", "==", pointerObject);
    }
    
    return query;
  },
  // 格式化笔记数据
  formatNotes(notes) {
    return notes.map(note => {
      console.log('完整的笔记数据:', note);
      console.log('作者信息:', note.author);
      console.log('作者昵称:', note.author ? note.author.nickname : '无昵称');
      
      return {
        id: note.objectId,
        title: note.content,
        author: note.author?.nickname || '匿名用户',
        likes: note.likeCount || 0,
        images: note.images || ['/assets/images/default-cover.png'],
        avatar: note.author?.avatar || '/assets/images/default-avatar.png',
        createTime: note.createdAt.split(' ')[0]
      };
    });
  },
  // 加载更多数据
  async loadMore() {
    if (!this.data.hasMore) return;
    
    wx.showLoading({
      title: '加载中...'
    });

    const query = this.getNotesQuery();
    query.limit(this.data.pageSize);
    query.skip(this.data.pageNum * this.data.pageSize);

    try {
      const notes = await query.find();
      const formattedNotes = this.formatNotes(notes);
      
      this.setData({
        contentList: [...this.data.contentList, ...formattedNotes],
        pageNum: this.data.pageNum + 1,
        hasMore: notes.length === this.data.pageSize
      });
    } catch (error) {
      console.error('加载更多失败:', error);
      wx.showToast({
        title: '加载更多失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },
  // 下拉刷新
  async onRefresh() {
    if (this.data.isRefreshing) return;
    
    this.setData({
      isRefreshing: true
    });

    try {
      await this.loadInitialData();
    } finally {
      this.setData({
        isRefreshing: false
      });
    }
  },
  // 切换分类
  switchTab(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      currentTab: index,
      contentList: [],
      pageNum: 1,
      hasMore: true
    });
    this.loadInitialData();
  },
  onPullDownRefresh() {
    // 下拉刷新逻辑
    wx.stopPullDownRefresh();
  },
  onReachBottom() {
    // 上拉加载更多逻辑
  },
  // 跳转到发布页面
  goToPublish() {
    const current = wx.Bmob.User.current();
    if (!current) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    wx.navigateTo({
      url: '/pages/publish/publish'
    });
  },
  // 跳转到搜索页面
  goToSearch() {
    wx.navigateTo({
      url: '/pages/search/search'
    });
  }
})
