Component({
  properties: {
    noteId: String,
    isLiked: {
      type: Boolean,
      value: false
    },
    isFavorited: {
      type: Boolean, 
      value: false
    },
    likeCount: {
      type: Number,
      value: 0
    },
    favoriteCount: {
      type: Number,
      value: 0
    },
    commentCount: {
      type: Number,
      value: 0
    }
  },

  data: {
    current: null
  },

  methods: {
    // 点赞
    async onLike() {
      const current = wx.Bmob.User.current();
      if (!current) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        setTimeout(() => {
          wx.navigateTo({
            url: '/pages/login/index'
          });
        }, 1500);
        return;
      }

      const query = wx.Bmob.Query('like');
      const notePointer = wx.Bmob.Pointer('note');
      const noteObject = notePointer.set(this.properties.noteId);
      const userPointer = wx.Bmob.Pointer('_User');
      const userObject = userPointer.set(current.objectId);
      
      try {
        if(!this.properties.isLiked) {
          // 添加点赞
          query.set("note", noteObject);
          query.set("user", userObject);
          await query.save();
          
          this.triggerEvent('like', {
            isLiked: true,
            likeCount: this.properties.likeCount + 1
          });

          wx.showToast({
            title: '点赞成功',
            icon: 'success'
          });
        } else {
          // 取消点赞
          query.equalTo("note", "==", noteObject);
          query.equalTo("user", "==", userObject);
          const res = await query.find();
          if (res.length > 0) {
            await query.destroy(res[0].objectId);
            
            this.triggerEvent('like', {
              isLiked: false,
              likeCount: this.properties.likeCount - 1
            });

            wx.showToast({
              title: '已取消点赞',
              icon: 'success'
            });
          }
        }
      } catch (error) {
        console.error('点赞操作失败:', error);
        wx.showToast({
          title: '操作失败，请重试',
          icon: 'none'
        });
      }
    },

    // 收藏
    async onFavorite() {
      const current = wx.Bmob.User.current();
      if (!current) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        setTimeout(() => {
          wx.navigateTo({
            url: '/pages/login/index'
          });
        }, 1500);
        return;
      }

      const query = wx.Bmob.Query('favorite');
      const notePointer = wx.Bmob.Pointer('note');
      const noteObject = notePointer.set(this.properties.noteId);
      const userPointer = wx.Bmob.Pointer('_User');
      const userObject = userPointer.set(current.objectId);

      try {
        if(!this.properties.isFavorited) {
          // 添加收藏
          query.set("note", noteObject);
          query.set("user", userObject);
          await query.save();
          
          this.triggerEvent('favorite', {
            isFavorited: true,
            favoriteCount: this.properties.favoriteCount + 1
          });

          wx.showToast({
            title: '收藏成功',
            icon: 'success'
          });
        } else {
          // 取消收藏
          query.equalTo("note", "==", noteObject);
          query.equalTo("user", "==", userObject);
          const res = await query.find();
          if (res.length > 0) {
            await query.destroy(res[0].objectId);
            
            this.triggerEvent('favorite', {
              isFavorited: false,
              favoriteCount: this.properties.favoriteCount - 1
            });

            wx.showToast({
              title: '已取消收藏',
              icon: 'success'
            });
          }
        }
      } catch (error) {
        console.error('收藏操作失败:', error);
        wx.showToast({
          title: '操作失败，请重试',
          icon: 'none'
        });
      }
    },

    // 分享
    onShare() {
      this.triggerEvent('share');
    },

    // 评论
    onComment() {
      this.triggerEvent('comment');
    }
  }
}) 