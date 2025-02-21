// components/custom-card/index.js
Component({
  properties: {
    title: {
      type: String,
      value: '默认标题'
    },
    content: String
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