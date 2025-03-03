Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 是否已关注
    isFollowing: {
      type: Boolean,
      value: false
    },
    // 被关注用户的ID
    userId: {
      type: String,
      value: ''
    },
    // 按钮尺寸，可选值：normal, small
    size: {
      type: String,
      value: 'normal'
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    loading: false
  },

  /**
   * 组件的方法列表
   */
  methods: {
    // 切换关注状态
    async toggleFollow() {
      if (this.data.loading) return;
      
      // 检查登录状态
      const current = wx.Bmob.User.current();
      if (!current) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        return;
      }

      // 检查用户ID是否存在
      if (!this.data.userId) {
        wx.showToast({
          title: '用户信息不存在',
          icon: 'none'
        });
        return;
      }

      this.setData({ loading: true });

      try {
        if (this.data.isFollowing) {
          // 取消关注
          const query = wx.Bmob.Query('follow');
          const userPointer = wx.Bmob.Pointer('_User');
          query.equalTo("follower", "==", userPointer.set(current.objectId));
          query.equalTo("following", "==", userPointer.set(this.data.userId));
          const res = await query.find();
          
          if (res.length > 0) {
            await query.destroy(res[0].objectId);
            
            // 更新组件内部状态
            this.setData({
              isFollowing: false
            });
            
            wx.showToast({
              title: '已取消关注',
              icon: 'success'
            });
          }
        } else {
          // 添加关注
          const follow = wx.Bmob.Query('follow');
          const userPointer = wx.Bmob.Pointer('_User');
          follow.set('follower', userPointer.set(current.objectId));
          follow.set('following', userPointer.set(this.data.userId));
          follow.set('status', 1);
          await follow.save();
          
          // 更新组件内部状态
          this.setData({
            isFollowing: true
          });
          
          wx.showToast({
            title: '关注成功',
            icon: 'success'
          });
        }

        // 触发关注/取消关注事件，通知页面
        this.triggerEvent('followChange', {
          isFollowing: this.data.isFollowing,
          userId: this.data.userId
        });
      } catch (error) {
        console.error('关注操作失败:', error);
        wx.showToast({
          title: '操作失败',
          icon: 'none'
        });
      } finally {
        this.setData({ loading: false });
      }
    }
  }
})
