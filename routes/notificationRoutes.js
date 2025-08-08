// backend/routes/notificationRoutes.js
const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const { authenticateJWT } = require("../middleware/"); // Assuming your JWT authentication middleware is here

// @route   GET /api/notifications
// @desc    Get all notifications for the authenticated user
// @access  Private
router.get("/", authenticateJWT, notificationController.getNotifications);

// @route   PUT /api/notifications/:id/read
// @desc    Mark a specific notification as read
// @access  Private (Owner only)
router.put(
  "/:id/read",
  authenticateJWT,
  notificationController.markNotificationAsRead
);

// @route   PUT /api/notifications/mark-all-read
// @desc    Mark all unread notifications for the authenticated user as read
// @access  Private
router.put(
  "/mark-all-read",
  authenticateJWT,
  notificationController.markAllNotificationsAsRead
);

// @route   DELETE /api/notifications/:id
// @desc    Delete a specific notification
// @access  Private (Owner only)
router.delete(
  "/:id",
  authenticateJWT,
  notificationController.deleteNotification
);

// @route   DELETE /api/notifications/clear-all
// @desc    Delete all notifications for the authenticated user
// @access  Private
router.delete(
  "/clear-all",
  authenticateJWT,
  notificationController.deleteAllUserNotifications
);

module.exports = router;
