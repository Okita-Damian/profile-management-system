const verifyEmailTemplate = (otp) => {
  return `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
    <!-- Header -->
    <div style="background-color: #4f46e5; padding: 20px; text-align: center; color: white;">
      <h2 style="margin: 0;">Profile App</h2>
    </div>

    <!-- Body -->
    <div style="padding: 20px; color: #333;">
      <h3>Hello,</h3>
      <p>Thank you for registering with <strong>Profile App</strong>. To complete your signup, please use the OTP below to verify your email:</p>

      <div style="text-align: center; margin: 30px 0;">
        <span style="font-size: 24px; font-weight: bold; color: #4f46e5; border: 2px dashed #4f46e5; padding: 10px 20px; border-radius: 6px; display: inline-block;">
          ${otp}
        </span>
      </div>

      <p style="font-size: 14px; color: #555;">This OTP is valid for <strong>10 minutes</strong>. If you didn't request this, please ignore this email.</p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 12px; color: #777;">
      <p style="margin: 0;">&copy; ${new Date().getFullYear()} Profile App. All rights reserved.</p>
    </div>
  </div>
  `;
};

module.exports = verifyEmailTemplate;
