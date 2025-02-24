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
    statusBarHeight: 0,
    navHeight: 0,
    pageNum: 1,
    pageSize: 6,
    hasMore: true,
    isRefreshing: false,
    categories: ['推荐', '穿搭', '美食', '彩妆', '影视', '职场', '情感', '更多'],
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
    const statusBarHeight = systemInfo.statusBarHeight;
    const navHeight = statusBarHeight + 48;

    // 设置CSS变量
    wx.getSystemInfo({
      success: (res) => {
        const style = document.createElement('style');
        style.innerHTML = `:root { --nav-height: ${navHeight}px; }`;
        document.head.appendChild(style);
      }
    });

    this.setData({
      statusBarHeight,
      navHeight
    });

    // 加载初始数据
    this.loadInitialData();
  },
  // 生成模拟数据
  generateMockData(pageNum) {
    const baseData = [
      {
        title: '株连九族有多恐怖？5000年仅此一人！',
        author: '伴读马老狮',
        likes: 3000,
      },
      {
        title: '小院转让｜广州新塘',
        author: '十方｜中式空间营造',
        likes: 169,
      },
      {
        title: '刀郎演唱',
        author: '刀郎新歌',
        likes: 2800,
      },
      {
        title: '为什么要读书，因为看到这雨打柿树你会说："秋去冬来..."',
        author: '文学日报',
        likes: 520,
      },
      {
        title: '这才是真正的中国传统建筑！',
        author: '建筑日记',
        likes: 1500,
      },
      {
        title: '年轻人的第一件汉服',
        author: '汉服文化',
        likes: 888,
      }
    ];

    // 为每个分类生成不同的数据
    const categoryData = baseData.map((item, index) => ({
      ...item,
      title: `${this.data.categories[this.data.currentTab]}-${pageNum}-${item.title}`,
    }));

    return categoryData.map((item, index) => ({
      id: pageNum * 6 + index + 1,
      ...item,
      images: ['/assets/images/default-cover.png'],
      avatar: '/assets/images/default-avatar.png',
      createTime: '2024-02-24'
    }));
  },
  // 加载初始数据
  loadInitialData() {
    const mockData = this.generateMockData(0);
    this.setData({
      contentList: mockData,
      pageNum: 1,
      hasMore: true
    });
  },
  // 加载更多数据
  loadMore() {
    console.log("hello");
    if (!this.data.hasMore) return;
    
    wx.showLoading({
      title: '加载中...'
    });

    // 模拟网络请求延迟
    setTimeout(() => {
      const mockData = this.generateMockData(this.data.pageNum);
      const hasMore = this.data.pageNum < 5; // 增加到5页数据

      this.setData({
        contentList: [...this.data.contentList, ...mockData],
        pageNum: this.data.pageNum + 1,
        hasMore
      });

      wx.hideLoading();
    }, 500);
  },
  // 下拉刷新
  onRefresh() {
    if (this.data.isRefreshing) return;
    
    this.setData({
      isRefreshing: true
    });

    setTimeout(() => {
      this.loadInitialData();
      this.setData({
        isRefreshing: false,
        hasMore: true
      });
    }, 500);
  },
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
  }
})
