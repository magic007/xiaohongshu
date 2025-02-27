Page({
  data: {
    images: [],
    videos: [],
    content: '',
    categories: [],
    selectedCategory: '',
    location: null,
    canPublish: false,
    currentVideoId: null
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

  // 选择媒体文件
  chooseMedia() {
    // 如果已经有视频，不允许再选择任何媒体
    if (this.data.videos.length > 0) {
      wx.showToast({
        title: '请先删除视频',
        icon: 'none'
      });
      return;
    }

    // 如果已经有图片，只允许继续选择图片
    if (this.data.images.length > 0) {
      wx.chooseMedia({
        count: 9 - this.data.images.length,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const tempFiles = res.tempFiles;
          this.uploadMediaFiles(tempFiles);
        }
      });
      return;
    }

    // 如果都没有，允许选择图片或视频
    wx.showActionSheet({
      itemList: ['选择图片', '选择视频'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 选择图片
          wx.chooseMedia({
            count: 9,
            mediaType: ['image'],
            sourceType: ['album', 'camera'],
            success: (res) => {
              const tempFiles = res.tempFiles;
              this.uploadMediaFiles(tempFiles);
            }
          });
        } else {
          // 选择视频
          wx.chooseMedia({
            count: 1,
            mediaType: ['video'],
            sourceType: ['album', 'camera'],
            maxDuration: 30,
            camera: 'back',
            success: (res) => {
              const tempFiles = res.tempFiles;
              // 清空已有的图片
              this.setData({ 
                images: [],
                videos: []
              });
              this.uploadMediaFiles(tempFiles);
            }
          });
        }
      }
    });
  },

  // 播放视频
  playVideo(e) {
    const videoId = e.currentTarget.dataset.id;
    // 如果有正在播放的视频，先停止它
    if (this.data.currentVideoId && this.data.currentVideoId !== videoId) {
      const oldVideo = wx.createVideoContext(this.data.currentVideoId);
      oldVideo.stop();
    }
    const videoContext = wx.createVideoContext(videoId);
    if (this.data.currentVideoId === videoId) {
      // 如果点击的是当前正在播放的视频，暂停它
      videoContext.pause();
      this.setData({ currentVideoId: null });
    } else {
      // 播放新的视频
      videoContext.play();
      this.setData({ currentVideoId: videoId });
    }
  },

  // 页面隐藏时停止视频播放
  onHide() {
    if (this.data.currentVideoId) {
      const videoContext = wx.createVideoContext(this.data.currentVideoId);
      videoContext.stop();
      this.setData({ currentVideoId: null });
    }
  },

  // 上传媒体文件到Bmob
  uploadMediaFiles(tempFiles) {
    wx.showLoading({
      title: '上传中...'
    });

    const uploadPromises = tempFiles.map(file => {
      return new Promise((resolve, reject) => {
        const isVideo = file.fileType === 'video';
        const fileName = isVideo ? `note_video_${Date.now()}.mp4` : `note_image_${Date.now()}.jpg`;
        const bmobFile = wx.Bmob.File(fileName, file.tempFilePath);
        
        bmobFile.save().then(res => {
          console.log('上传结果：', res);
          try {
            let result = res;
            if (typeof res === 'string') {
              result = JSON.parse(res);
            }
            if (Array.isArray(result)) {
              result = result[0];
            }
            let fileUrl = result.url;
            if (!fileUrl) {
              throw new Error('文件URL不存在');
            }

            // 处理视频URL
            if (isVideo) {
              // 确保URL使用HTTPS
              fileUrl = fileUrl.replace('http://', 'https://');
              
              // 验证视频URL是否可访问
              wx.request({
                url: fileUrl,
                method: 'HEAD',
                success: () => {
                  resolve({
                    url: fileUrl,
                    type: 'video',
                    duration: file.duration,
                    thumbUrl: file.thumbTempFilePath,
                    size: file.size,
                    width: file.width,
                    height: file.height
                  });
                },
                fail: (error) => {
                  console.error('视频URL验证失败：', error);
                  reject(new Error('视频文件无法访问'));
                }
              });
            } else {
              // 图片文件直接返回
              resolve({
                url: fileUrl,
                type: 'image'
              });
            }
          } catch (error) {
            console.error('解析文件URL失败：', error);
            reject(error);
          }
        }).catch(err => {
          console.error('上传失败：', err);
          reject(err);
        });
      });
    });

    Promise.all(uploadPromises).then(results => {
      console.log('所有文件上传完成：', results);
      const validResults = results.filter(result => result && result.url);
      
      if (validResults.length > 0) {
        const newImages = [];
        const newVideos = [];
        
        validResults.forEach(result => {
          if (result.type === 'video') {
            // 转换视频信息
            const videoInfo = {
              url: result.url,
              duration: result.duration || 0,
              thumbUrl: result.thumbUrl || '',
              size: result.size || 0,
              width: result.width || 0,
              height: result.height || 0
            };
            newVideos.push(videoInfo);
            console.log('添加视频：', videoInfo);
          } else {
            newImages.push(result.url);
          }
        });

        this.setData({
          images: [...this.data.images, ...newImages],
          videos: [...this.data.videos, ...newVideos]
        }, () => {
          // 在设置完数据后打印当前状态
          console.log('当前视频列表：', this.data.videos);
        });
        this.checkCanPublish();
      }
      wx.hideLoading();
    }).catch(err => {
      console.error('文件上传或处理失败：', err);
      wx.hideLoading();
      wx.showToast({
        title: err.message || '上传失败',
        icon: 'none'
      });
    });
  },

  // 删除媒体文件
  deleteMedia(e) {
    const { index, type } = e.currentTarget.dataset;
    if (type === 'video') {
      this.setData({ videos: [] });
    } else {
      const images = this.data.images;
      images.splice(index, 1);
      this.setData({ images });
    }
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
    const { images, videos, content, selectedCategory } = this.data;
    const hasMedia = images.length > 0 || videos.length > 0;
    const canPublish = hasMedia && content.trim() && selectedCategory;
    this.setData({ canPublish });
  },

  // 取消发布
  onCancel() {
    wx.navigateBack();
  },

  // 发布笔记
  onPublish() {
    if (!this.data.canPublish) return;

    const { images, videos, content, selectedCategory, location } = this.data;
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
    
    // 设置视频信息
    if (videos.length > 0) {
      const videoInfo = videos[0]; // 只取第一个视频
      Note.set('video', videoInfo.url); // 设置单个视频URL
      Note.set('videos', [videoInfo]); // 保存完整视频信息到数组
    } else {
      Note.set('video', '');
      Note.set('videos', []);
    }
    
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
        // 跳转到首页（tabBar页面）
        wx.switchTab({
          url: '/pages/index/index',
          success: () => {
            // 发布成功后，可以刷新首页数据
            const pages = getCurrentPages();
            const indexPage = pages.find(page => page.route === 'pages/index/index');
            if (indexPage && indexPage.onPullDownRefresh) {
              indexPage.onPullDownRefresh();
            }
          }
        });
      }, 1500);
    }).catch(err => {
      console.error('发布失败：', err);
      wx.showToast({
        title: '发布失败',
        icon: 'none'
      });
    });
  },

  // 视频播放错误处理
  onVideoError(e) {
    console.error('视频播放错误：', e.detail);
    wx.showToast({
      title: '视频播放失败',
      icon: 'none'
    });
  }
}); 