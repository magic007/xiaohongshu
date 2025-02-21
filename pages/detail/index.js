// pages/detail/index.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    message: "慕课网欢迎你",
    userInfo: {
      name: "老莫",
      title: "全栈讲师"
    },
    courseList: ["小程序开发", "Vue实战", "React进阶"],
    tapCount: 0,
    inputValue: ''
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    console.log(options.name) // 将输出 "慕课"
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  // 1. 点击事件处理函数
  handleTap() {
    this.setData({
      tapCount: this.data.tapCount + 1
    })
    wx.showToast({
      title: '点击成功',
      icon: 'success'
    })
  },

  // 2. 输入事件处理函数
  handleInput(e) {
    this.setData({
      inputValue: e.detail.value
    })
  },

  // 3. 表单提交处理函数
  handleSubmit(e) {
    const formData = e.detail.value
    let tapCount=9
    this.setData({
      tapCount:tapCount
    })
    wx.showModal({
      title: '表单数据',
      content: `用户名：${formData.username}，年龄：${formData.age}`,
      showCancel: false
    })
  }
})