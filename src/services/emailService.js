const sendEmail = require("../utils/sendEmail");
const verifyEmailTemplate = require("../utils/emailTemplates/verifyEmail");
const resendOTPTemplate = require("../utils/emailTemplates/resendOTP");
const passwordResetTemplate = require("../utils/emailTemplates/passwordReset");
const passwordResetSuccessTemplate = require("../utils/emailTemplates/passwordResetSuccess");

class EmailService {
  constructor() {
    this.from = process.env.EMAIL_USERNAME;
  }

  async sendVerificationEmail(email, otp) {
    await sendEmail({
      from: this.from,
      to: email,
      subject: "Verify Your Email - Profile App",
      html: verifyEmailTemplate(otp),
    });
  }

  async sendResendOTPEmail(email, otp) {
    await sendEmail({
      from: this.from,
      to: email,
      subject: "Your New OTP - Profile App",
      html: resendOTPTemplate(otp),
    });
  }

  async sendPasswordResetEmail(email, otp) {
    await sendEmail({
      from: this.from,
      to: email,
      subject: "Password Reset Request - Profile App",
      html: passwordResetTemplate(otp),
    });
  }

  async sendPasswordResetSuccessEmail(email, fullName) {
    await sendEmail({
      from: this.from,
      to: email,
      subject: "Password Reset Successful - Profile App",
      html: passwordResetSuccessTemplate(fullName),
    });
  }
}

module.exports = new EmailService();
