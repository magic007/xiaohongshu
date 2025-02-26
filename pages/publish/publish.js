Page({
  data: {
    images: [],
    content: '',
    categories: [],
    selectedCategory: '',
    location: null,
    canPublish: false
  },

  onLoad() {
    this.loadCategories();
  },

  // 加载分类数据
  loadCategories() {
    const query = wx.Bmob.Query('category');
    query.find().then(res => {
      this.setData({
        categories: res
      });
    });
  },

  // 选择图片
  chooseImage() {
    wx.chooseImage({
      count: 9 - this.data.images.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePaths = res.tempFilePaths;
        this.uploadImages(tempFilePaths);
      }
    });
  },

  // 上传图片到Bmob
  uploadImages(tempFilePaths) {
    wx.showLoading({
      title: '上传中...'
    });

    const uploadPromises = tempFilePaths.map(item => {
      return new Promise((resolve, reject) => {
        const file = wx.Bmob.File('note.jpg', item);
        file.save().then(res => {
          console.log('上传结果：', res);
          try {
            // 解析返回结果
            let result = res;
            if (typeof res === 'string') {
              result = JSON.parse(res);
            }
            // 处理数组格式的返回值
            if (Array.isArray(result)) {
              result = result[0]; // 获取数组中的第一个对象
            }
            // 确保返回完整的图片URL
            const imageUrl = result.url;
            if (!imageUrl) {
              throw new Error('图片URL不存在');
            }
            console.log('解析后的图片URL：', imageUrl);
            resolve(imageUrl);
          } catch (error) {
            console.error('解析图片URL失败：', error);
            reject(error);
          }
        }).catch(err => {
          console.error('上传失败：', err);
          reject(err);
        });
      });
    });

    Promise.all(uploadPromises).then(urls => {
      console.log('所有图片上传完成，URLs：', urls);
      // 过滤掉无效的URL
      const validUrls = urls.filter(url => url && typeof url === 'string');
      if (validUrls.length > 0) {
        this.setData({
          images: [...this.data.images, ...validUrls]
        });
        this.checkCanPublish();
      } else {
        throw new Error('没有有效的图片URL');
      }
      wx.hideLoading();
    }).catch(err => {
      console.error('图片上传或处理失败：', err);
      wx.hideLoading();
      wx.showToast({
        title: '图片处理失败',
        icon: 'none'
      });
    });
  },

  // 删除图片
  deleteImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.images;
    images.splice(index, 1);
    this.setData({ images });
    this.checkCanPublish();
  },

  // 内容输入
  onContentInput(e) {
    this.setData({
      content: e.detail.value
    });
    this.checkCanPublish();
  },

  // 选择分类
  selectCategory(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({
      selectedCategory: id
    });
    this.checkCanPublish();
  },

  // 选择位置
  chooseLocation() {
    const that = this;
    wx.authorize({
      scope: 'scope.userLocation',
      success() {
        wx.getLocation({
          type: 'gcj02',
          success(res) {
            wx.chooseLocation({
              latitude: res.latitude,
              longitude: res.longitude,
              success: (location) => {
                console.log('位置选择结果：', location);
                that.setData({
                  location: {
                    name: location.name || location.address,
                    address: location.address,
                    latitude: location.latitude,
                    longitude: location.longitude
                  }
                });
              },
              fail: (err) => {
                console.error('选择位置失败：', err);
                if (err.errMsg.indexOf('auth deny') !== -1) {
                  wx.showModal({
                    title: '提示',
                    content: '需要您授权使用位置信息，是否去设置？',
                    success: (res) => {
                      if (res.confirm) {
                        wx.openSetting({
                          success: (settingRes) => {
                            if (settingRes.authSetting['scope.userLocation']) {
                              that.chooseLocation();
                            }
                          }
                        });
                      }
                    }
                  });
                } else {
                  wx.showToast({
                    title: '选择位置失败',
                    icon: 'none'
                  });
                }
              }
            });
          },
          fail(err) {
            console.error('获取位置失败：', err);
            wx.showToast({
              title: '获取位置失败',
              icon: 'none'
            });
          }
        });
      },
      fail() {
        wx.showModal({
          title: '提示',
          content: '需要您授权使用位置信息，是否去设置？',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting({
                success: (settingRes) => {
                  if (settingRes.authSetting['scope.userLocation']) {
                    that.chooseLocation();
                  }
                }
              });
            }
          }
        });
      }
    });
  },

  // 检查是否可以发布
  checkCanPublish() {
    const { images, content, selectedCategory } = this.data;
    const canPublish = images.length > 0 && content.trim() && selectedCategory;
    this.setData({ canPublish });
  },

  // 取消发布
  onCancel() {
    wx.navigateBack();
  },

  // 发布笔记
  onPublish() {
    if (!this.data.canPublish) return;

    const { images, content, selectedCategory, location } = this.data;
    const current = wx.Bmob.User.current();
    
    if (!current) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    const Note = wx.Bmob.Query('note');
    Note.set('content', content);
    Note.set('images', images);
    
    // 设置分类
    const pointer = wx.Bmob.Pointer('category');
    const category = pointer.set(selectedCategory);
    Note.set('category', category);
    
    // 设置作者
    const userPointer = wx.Bmob.Pointer('_User');
    const author = userPointer.set(current.objectId);
    Note.set('author', author);

    // 设置位置信息
    if (location) {
      const geoPoint = {
        __type: 'GeoPoint',
        latitude: location.latitude,
        longitude: location.longitude
      };
      Note.set('location', geoPoint);
    }

    // 设置初始数据
    Note.set('likeCount', 0);
    Note.set('commentCount', 0);
    Note.set('shareCount', 0);
    Note.set('status', 1); // 1表示已发布状态

    Note.save().then(() => {
      wx.showToast({
        title: '发布成功',
        icon: 'success'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }).catch(err => {
      wx.showToast({
        title: '发布失败',
        icon: 'none'
      });
    });
  }
}); 