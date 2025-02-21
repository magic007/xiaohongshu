// 发送验证码
const sendSmsCode = (phone) => {
  return new Promise((resolve, reject) => {
    wx.Bmob.requestSmsCode({
      mobilePhoneNumber: phone,
    }).then(res => {
      resolve(res);
    }).catch(err => {
      reject(err);
    });
  });
}

// 验证验证码
const verifySmsCode = (phone, code) => {
  return new Promise((resolve, reject) => {
    let smsCode = code;
    let data = {
      mobilePhoneNumber: phone
    };
    wx.Bmob.verifySmsCode(smsCode, data).then(res => {
      resolve(res);
    }).catch(err => {
      reject(err);
    });
  });
}

module.exports = {
  sendSmsCode,
  verifySmsCode
} 