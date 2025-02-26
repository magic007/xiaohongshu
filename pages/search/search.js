// search.js
Page({
  data: {
    searchText: '',
    searching: false,
    recommendList: ['穿搭', '家常菜', '文案', '头像', '健身', '学习', '美甲', '装修'],
    searchResults: [],
    hasMore: true,
    page: 1,
    pageSize: 10
  },

  onLoad(options) {
    // 如果从首页传入了搜索关键词
    if (options.keyword) {
      this.setData({
        searchText: options.keyword
      });
      this.onSearch();
    }
  },

  // 输入搜索内容
  onSearchInput(e) {
    this.setData({
      searchText: e.detail.value
    });
  },

  // 执行搜索
  onSearch() {
    if (!this.data.searchText.trim()) return;
    
    this.setData({
      searching: true,
      searchResults: [],
      page: 1,
      hasMore: true
    });
    
    this.loadSearchResults();
  },

  // 加载搜索结果
  async loadSearchResults() {
    if (!this.data.hasMore) return;
    
    wx.showLoading({
      title: '搜索中...',
    });

    try {
      const query = wx.Bmob.Query("note");
      // 按内容模糊搜索
      query.equalTo("content","==", { "$regex": "" + this.data.searchText + ".*" });
      // 包含作者信息
      query.include("author");
      // 按创建时间倒序
      query.order("-createdAt");
      // 分页
      query.limit(this.data.pageSize);
      query.skip((this.data.page - 1) * this.data.pageSize);

      const notes = await query.find();
      
      // 格式化笔记数据
      const formattedNotes = notes.map(note => ({
        id: note.objectId,
        title: note.content,
        author: note.author?.nickname || '匿名用户',
        likes: note.likeCount || 0,
        images: note.images || ['/assets/images/default-cover.png'],
        avatar: note.author?.avatar || '/assets/images/default-avatar.png',
        createTime: note.createdAt.split(' ')[0]
      }));

      this.setData({
        searchResults: [...this.data.searchResults, ...formattedNotes],
        page: this.data.page + 1,
        hasMore: notes.length === this.data.pageSize
      });
    } catch (error) {
      console.error('搜索失败:', error);
      wx.showToast({
        title: '搜索失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 点击推荐
  onTapRecommend(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({
      searchText: keyword
    });
    this.onSearch();
  },

  // 取消搜索
  onCancel() {
    wx.navigateBack();
  },

  // 加载更多
  loadMore() {
    if (this.data.searching) {
      this.loadSearchResults();
    }
  },

  // 跳转到详情页
  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/detail/index?id=${id}`
    });
  }
}); 