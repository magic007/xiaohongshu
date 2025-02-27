Component({
  properties: {
    note: {
      type: Object,
      value: {}
    },
    type: {
      type: String,
      value: 'image' // 'image' 或 'video'
    }
  },

  data: {
    gradientBg: 'linear-gradient(120deg, #e0c3fc 0%, #8ec5fc 100%)'
  },

  methods: {
    onTapCard() {
      const { note } = this.properties;
      // 根据笔记类型跳转到不同页面
      const url = note.video 
        ? `/pages/video-detail/index?id=${note.id}`
        : `/pages/detail/index?id=${note.id}`;
        
      wx.navigateTo({ url });
    },

    onTapLike(e) {
      const { note } = this.properties;
      // 阻止事件冒泡
      e.stopPropagation();
      this.triggerEvent('like', { note });
    }
  }
}); 