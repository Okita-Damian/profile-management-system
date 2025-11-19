const passwordResetSuccessTemplate = (fullName) => {
  return `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
    <div style="background-color: #4f46e5; padding: 20px; text-align: center; color: white;">
      <h2 style="margin: 0;">Profile App</h2>
    </div>
    <div style="padding: 20px; color: #333;">
      <h3>Hello ${fullName},</h3>
      <p>Your password has been successfully reset. You can now log in using your new password.</p>
      <p>If you did not request this change, please contact our support immediately.</p>
    </div>
    <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 12px; color: #777;">
      <p style="margin: 0;">&copy; ${new Date().getFullYear()} Profile App. All rights reserved.</p>
    </div>
  </div>
  `;
};

module.exports = passwordResetSuccessTemplate;
