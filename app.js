// app.js
const Bmob = require('./utils/Bmob-2.5.30.min.js')

App({
  
  onLaunch() {
    // 初始化 Bmob
    Bmob.initialize("831cdbf636d4c174", "muke123456")

    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

 

    // 调用Bmob一键登录，自动关联微信用户
    Bmob.User.auth().then(res => {
      console.log('一键登录成功', res)
      // res中包含用户openid等信息
      // 可以在这里进行用户信息的存储和处理
    }).catch(err => {
      console.log('登录失败', err)
    })

    // 删除一条数据记录
    // const query = Bmob.Query('test');
    // query.destroy('118030eb7d').then(res => {
    //   console.log('删除成功', res)
    // }).catch(err => {
    //   console.log('删除失败', err)
    // })

    // 新增一条数据
// const query = Bmob.Query('test');
// query.set("name", "张三");
// query.save().then(res => {
//     console.log('创建成功：', res);
// });



// let orderParams = {
//     funcName: 'testAdd',
//     data: {
//       name:"北京"
//     }
// };
// Bmob.functions(orderParams.funcName, orderParams.data).then(function(response) {
//     console.log('订单列表：', response);
// }).catch(function(error) {
//     console.log('获取失败：', error);
// });

    // 登录
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      }
    })
  },
  globalData: {
    userInfo: null
  }
})
