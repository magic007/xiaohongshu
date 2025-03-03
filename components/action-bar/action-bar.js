Component({
  properties: {
    noteId: {
      type: String,
      value: '',
      observer: function(newVal) {
        if (newVal) {
          this.initData();
          this.checkUserInteraction();
        }
      }
    },
    commentCount: {
      type: Number,
      value: 0
    },
    isDark: {
      type: Boolean,
      value: false
    }
  },

  data: {
    _isLiked: false,
    _isFavorited: false,
    _likeCount: 0,
    _favoriteCount: 0
  },

  lifetimes: {
    attached() {
      if (this.properties.noteId) {
        this.initData();
        this.checkUserInteraction();
      }
    }
  },

  methods: {
    // 初始化数据
    async initData() {
      try {
        const noteQuery = wx.Bmob.Query('note');
        const note = await noteQuery.get(this.properties.noteId);
        
        this.setData({
          _likeCount: note.likeCount || 0,
          _favoriteCount: note.favoriteCount || 0
        });
      } catch (error) {
        console.error('获取数据失败:', error);
      }
    },

    // 检查用户是否点赞和收藏
    async checkUserInteraction() {
      const current = wx.Bmob.User.current();
      if (!current) return;

      try {
        // 检查是否点赞
        const likeQuery = wx.Bmob.Query('like');
        const notePointer = wx.Bmob.Pointer('note');
        const userPointer = wx.Bmob.Pointer('_User');
        likeQuery.equalTo("note", "==", notePointer.set(this.properties.noteId));
        likeQuery.equalTo("user", "==", userPointer.set(current.objectId));
        const likeResult = await likeQuery.find();
        
        // 检查是否收藏
        const favoriteQuery = wx.Bmob.Query('favorite');
        favoriteQuery.equalTo("note", "==", notePointer.set(this.properties.noteId));
        favoriteQuery.equalTo("user", "==", userPointer.set(current.objectId));
        const favoriteResult = await favoriteQuery.find();

        this.setData({
          _isLiked: likeResult.length > 0,
          _isFavorited: favoriteResult.length > 0
        });
      } catch (error) {
        console.error('检查用户交互状态失败:', error);
      }
    },

    // 更新笔记的点赞和收藏数量
    async updateNoteStats(type, isAdd) {
      try {
        const noteQuery = wx.Bmob.Query('note');
        const note = await noteQuery.get(this.properties.noteId);
        
        if (type === 'like') {
          const newCount = Math.max(0, (note.likeCount || 0) + (isAdd ? 1 : -1));
          note.set('likeCount', newCount);
        } else if (type === 'favorite') {
          const newCount = Math.max(0, (note.favoriteCount || 0) + (isAdd ? 1 : -1));
          note.set('favoriteCount', newCount);
        }
        
        await note.save();
      } catch (error) {
        console.error('更新笔记统计失败:', error);
      }
    },

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

      try {
        if (!this.data._isLiked) {
          // 添加点赞
          const query = wx.Bmob.Query('like');
          const notePointer = wx.Bmob.Pointer('note');
          const userPointer = wx.Bmob.Pointer('_User');
          query.set("note", notePointer.set(this.properties.noteId));
          query.set("user", userPointer.set(current.objectId));
          await query.save();
          
          await this.updateNoteStats('like', true);
          
          this.setData({
            _isLiked: true,
            _likeCount: this.data._likeCount + 1
          });

          wx.showToast({
            title: '点赞成功',
            icon: 'success'
          });
        } else {
          // 取消点赞
          const query = wx.Bmob.Query('like');
          const notePointer = wx.Bmob.Pointer('note');
          const userPointer = wx.Bmob.Pointer('_User');
          query.equalTo("note", "==", notePointer.set(this.properties.noteId));
          query.equalTo("user", "==", userPointer.set(current.objectId));
          const res = await query.find();
          
          if (res.length > 0) {
            await query.destroy(res[0].objectId);
            await this.updateNoteStats('like', false);
            
            // 确保点赞数不会小于0
            const newLikeCount = Math.max(0, this.data._likeCount - 1);
            this.setData({
              _isLiked: false,
              _likeCount: newLikeCount
            });

            wx.showToast({
              title: '已取消点赞',
              icon: 'success'
            });
          }
        }

        // 触发事件通知父组件
        this.triggerEvent('like', {
          isLiked: this.data._isLiked,
          likeCount: this.data._likeCount
        });
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

      try {
        if (!this.data._isFavorited) {
          // 添加收藏
          const query = wx.Bmob.Query('favorite');
          const notePointer = wx.Bmob.Pointer('note');
          const userPointer = wx.Bmob.Pointer('_User');
          query.set("note", notePointer.set(this.properties.noteId));
          query.set("user", userPointer.set(current.objectId));
          await query.save();
          
          await this.updateNoteStats('favorite', true);
          
          this.setData({
            _isFavorited: true,
            _favoriteCount: this.data._favoriteCount + 1
          });

          wx.showToast({
            title: '收藏成功',
            icon: 'success'
          });
        } else {
          // 取消收藏
          const query = wx.Bmob.Query('favorite');
          const notePointer = wx.Bmob.Pointer('note');
          const userPointer = wx.Bmob.Pointer('_User');
          query.equalTo("note", "==", notePointer.set(this.properties.noteId));
          query.equalTo("user", "==", userPointer.set(current.objectId));
          const res = await query.find();
          
          if (res.length > 0) {
            await query.destroy(res[0].objectId);
            await this.updateNoteStats('favorite', false);
            
            // 确保收藏数不会小于0
            const newFavoriteCount = Math.max(0, this.data._favoriteCount - 1);
            this.setData({
              _isFavorited: false,
              _favoriteCount: newFavoriteCount
            });

            wx.showToast({
              title: '已取消收藏',
              icon: 'success'
            });
          }
        }

        // 触发事件通知父组件
        this.triggerEvent('favorite', {
          isFavorited: this.data._isFavorited,
          favoriteCount: this.data._favoriteCount
        });
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