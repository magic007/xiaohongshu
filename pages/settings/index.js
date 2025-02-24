Page({
  data: {
    userInfo: {
      avatar: '',
      nickname: '',
      bio: ''
    }
  },

  onLoad() {
    this.getCurrentUser();
  },

  // 获取当前用户信息
  getCurrentUser() {
    const current = wx.Bmob.User.current();
    if (current) {
      this.setData({
        userInfo: {
          avatar: current.avatar || '',
          nickname: current.nickname || '',
          bio: current.signature || ''
        }
      });
    } else {
      wx.navigateTo({
        url: '/pages/login/login'
      });
    }
  },

  // 选择头像
  chooseAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        // 上传图片到 Bmob
        const file = wx.Bmob.File('avatar.jpg', tempFilePath);
        file.save().then(res => {
          const avatarUrl = res[0].url;
          this.setData({
            'userInfo.avatar': avatarUrl
          });
        }).catch(err => {
          wx.showToast({
            title: '头像上传失败',
            icon: 'none'
          });
        });
      }
    });
  },

  // 昵称输入
  onNicknameInput(e) {
    this.setData({
      'userInfo.nickname': e.detail.value
    });
  },

  // 个性签名输入
  onBioInput(e) {
    this.setData({
      'userInfo.bio': e.detail.value
    });
  },

  // 保存用户信息
  saveUserInfo() {
    const current = wx.Bmob.User.current();
    if (!current) return;

    // 验证昵称
    if (!this.data.userInfo.nickname.trim()) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '保存中...'
    });

    const query = wx.Bmob.Query('_User');
    query.get(current.objectId).then(user => {
      user.set('avatar', this.data.userInfo.avatar);
      user.set('nickname', this.data.userInfo.nickname);
      user.set('signature', this.data.userInfo.bio);
      return user.save();
    }).then(res => {
      wx.hideLoading();
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });
      // 返回上一页并刷新
      const pages = getCurrentPages();
      const prevPage = pages[pages.length - 2];
      if (prevPage && prevPage.getCurrentUser) {
        prevPage.getCurrentUser();
      }
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    });
  }
}) 