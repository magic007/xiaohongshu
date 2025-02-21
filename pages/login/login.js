const { sendSmsCode, verifySmsCode } = require('../../utils/bmob.js')

Page({
  data: {
    phone: '',
    code: '',
    countdown: 0,
    isAgree: false,
    canGetCode: false,
    canLogin: false
  },
  onLoad() {
  },

  // 手机号输入
  onPhoneInput(e) {
    const phone = e.detail.value
    this.setData({
      phone,
      canGetCode: phone.length === 11 // 只要手机号满11位就可以获取验证码
    })
    this.checkCanLogin()
  },

  // 验证码输入
  onCodeInput(e) {
    const code = e.detail.value
    this.setData({ code })
    this.checkCanLogin()
  },

  // 切换协议同意状态
  toggleAgreement() {
    const isAgree = !this.data.isAgree
    this.setData({
      isAgree
    })
    this.checkCanLogin()
  },

  // 检查是否可以登录
  checkCanLogin() {
    const { phone, code, isAgree } = this.data
    this.setData({
      canLogin: phone.length === 11 && code.length === 6 && isAgree
    })
  },

  // 获取验证码
  async getCode() {
    if (!this.data.canGetCode || this.data.countdown > 0) return

    const { phone } = this.data
    try {
      await sendSmsCode(phone)
      this.startCountdown()
      wx.showToast({
        title: '验证码已发送',
        icon: 'success'
      })
    } catch (error) {
      wx.showToast({
        title: error.message || '发送失败',
        icon: 'none'
      })
    }
  },

  // 开始倒计时
  startCountdown() {
    let countdown = 60
    this.setData({ countdown })
    
    const timer = setInterval(() => {
      countdown--
      if (countdown <= 0) {
        clearInterval(timer)
      }
      this.setData({ countdown })
    }, 1000)
  },

  // 处理登录
  async handleLogin() {
    if (!this.data.canLogin) return

    const { phone, code } = this.data
    try {
      await verifySmsCode(phone, code)
      
      // 登录成功后的处理
      wx.setStorageSync('userPhone', phone)
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      })
      
      // 延迟跳转到首页
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        })
      }, 1500)
      
    } catch (error) {
      wx.showToast({
        title: error.message || '登录失败',
        icon: 'none'
      })
    }
  }
}) 