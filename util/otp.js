
const fast2sms = require("fast-two-sms");


exports.generateOTP = (otp_length) => {
  // Declare a digits variable
  // which stores all digits
  console.log("otp length is ", otp_length)
  var digits = "0123456789";
  console.log(digits);
  let OTP = "";
  for (let i = 0; i < otp_length; i++) {
    OTP += digits[Math.floor(Math.random() * 10)];
  }
  return OTP;
};

exports.fast2sms = async ({ message, contactNumber }, next) => {
  try {
    const res = await fast2sms.sendMessage({
      authorization: "blah",
      message,
      numbers: [contactNumber],
    });
    console.log(res);
  } catch (error) {
    next(error);
  }
};
