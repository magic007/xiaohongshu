Page({
  data: {
    currentTab: 1, // 默认显示收藏tab
    userInfo: {
      nickname: '小红薯677762ED',
      userId: '94151738841',
      avatar: '',
      bio: '还没有简介',
      stats: {
        following: 0,
        followers: 0,
        likes: 0
      }
    },
    // 笔记列表
    noteList: [
      {
        id: 1,
        image: '',
        title: '今天去吃了一家新开的火锅店，味道真不错',
        author: {
          avatar: '',
          nickname: '小红薯677762ED'
        },
        likes: 128
      },
      {
        id: 2,
        image: '',
        title: '分享我的护肤心得，从此告别痘痘',
        author: {
          avatar: '',
          nickname: '小红薯677762ED'
        },
        likes: 256
      }
    ],
    // 收藏列表
    collectionList: [
      {
        id: 1,
        image: '',
        title: '老婆自己做的泡菜，不敢吃该怎么拒绝',
        author: {
          avatar: '',
          nickname: '爱吃冰西瓜🍉'
        },
        likes: 5366
      },
      {
        id: 2,
        image: '',
        title: '超级好吃的家常菜，学会了不用天天点外卖',
        author: {
          avatar: '',
          nickname: '美食达人'
        },
        likes: 3288
      },
      {
        id: 3,
        image: '',
        title: '分享一个快手早餐的做法，营养美味省时间',
        author: {
          avatar: '',
          nickname: '早餐控'
        },
        likes: 2199
      },
      {
        id: 4,
        image: '',
        title: '自制美味小零食，解馋又健康，太好吃了',
        author: {
          avatar: '',
          nickname: '甜品控'
        },
        likes: 1866
      }
    ],
    // 赞过列表
    likedList: [
      {
        id: 1,
        image: '',
        title: '超实用的穿搭技巧，让你轻松提升时尚感',
        author: {
          avatar: '',
          nickname: '穿搭博主'
        },
        likes: 8899
      },
      {
        id: 2,
        image: '',
        title: '10分钟快速收纳术，让家里永远整整齐齐',
        author: {
          avatar: '',
          nickname: '生活达人'
        },
        likes: 6677
      },
      {
        id: 3,
        image: '',
        title: '新手化妆必看，手把手教你打造清透妆容',
        author: {
          avatar: '',
          nickname: '美妆达人'
        },
        likes: 5544
      }
    ]
  },

  onLoad() {
    // 页面加载时的逻辑
  },

  switchTab(e) {
    const index = e.currentTarget.dataset.index;
    if (this.data.currentTab === index) return; // 避免重复切换
    this.setData({
      currentTab: index
    });
  }
}) 