// components/custom-card/index.js
Component({
  properties: {
    title: {
      type: String,
      value: '默认标题'
    },
    content: String,
    likeCount: {
      type: Number,
      value: 0
    }
  },
  
  data: {
    showContent: false
  },
  
  methods: {
    toggleContent() {
      this.setData({
        showContent: !this.data.showContent
      })
    }
  }
})