const nodemailer = require("nodemailer");

// Create a transporter using your email service details
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_PORT == 465, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendPasswordResetEmail = async (userEmail, resetToken) => {
  const resetUrl = `${process.env.APP_FRONTEND_URL}/auth/reset-password/${resetToken}`; // Adjust frontend path if needed

  const mailOptions = {
    from: process.env.EMAIL_USER, // Sender address
    to: userEmail, // List of recipients
    subject: "Password Reset Request for Your Estate Account", // Subject line
    html: `
      <p>You are receiving this because you (or someone else) have requested the reset of the password for your account.</p>
      <p>Please click on the following link, or paste this into your browser to complete the process:</p>
      <p><a href="${resetUrl}">Reset Password</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
      <br>
      <p>Regards,</p>
      <p>Your Estate Management Team</p>
    `, // HTML body
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${userEmail}`);
    return true;
  } catch (error) {
    console.error(`Error sending password reset email to ${userEmail}:`, error);
    return false;
  }
};

module.exports = {
  sendPasswordResetEmail,
};
