// backend/controllers/notificationController.js
const Notification = require("../models/Notification");
const { sendSuccessResponse, sendErrorResponse } = require("../utils/helpers");
const {
  AuthorizationError,
  NotFoundError,
  ServerError,
} = require("../utils/constants");

// @route   GET /api/notifications
// @desc    Get all notifications for the authenticated user
// @access  Private (Authenticated User)
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id; // Get user ID from authenticated request
    const { is_read, limit, offset } = req.query; // Optional filters

    // Convert 'is_read' query param to boolean or keep as undefined
    let filterIsRead;
    if (is_read !== undefined) {
      filterIsRead = is_read === "true"; // Convert string 'true'/'false' to boolean
    }

    const notifications = await Notification.findByUserId(
      userId,
      filterIsRead,
      parseInt(limit) || undefined,
      parseInt(offset) || undefined
    );

    sendSuccessResponse(res, 200, "Notifications retrieved successfully", {
      notifications,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error.message, error.stack);
    sendErrorResponse(
      res,
      500,
      ServerError.INTERNAL_SERVER_ERROR,
      "Failed to retrieve notifications."
    );
  }
};

// @route   PUT /api/notifications/:id/read
// @desc    Mark a specific notification as read
// @access  Private (Authenticated User - must own notification)
const markNotificationAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return sendErrorResponse(
        res,
        404,
        NotFoundError.NOTIFICATION_NOT_FOUND,
        "Notification not found."
      );
    }

    // Authorization: User must own the notification
    if (notification.user_id !== userId) {
      return sendErrorResponse(
        res,
        403,
        AuthorizationError.NOT_AUTHORIZED,
        "You are not authorized to mark this notification as read."
      );
    }

    const updated = await Notification.markAsRead(notificationId);

    if (!updated) {
      return sendErrorResponse(
        res,
        400,
        ServerError.OPERATION_FAILED,
        "Failed to mark notification as read. It might already be read."
      );
    }

    sendSuccessResponse(res, 200, "Notification marked as read successfully.");
  } catch (error) {
    console.error(
      "Error marking notification as read:",
      error.message,
      error.stack
    );
    sendErrorResponse(
      res,
      500,
      ServerError.INTERNAL_SERVER_ERROR,
      "Failed to mark notification as read."
    );
  }
};

// @route   PUT /api/notifications/mark-all-read
// @desc    Mark all unread notifications for the authenticated user as read
// @access  Private (Authenticated User)
const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    // First, find all unread notifications for the user
    const unreadNotifications = await Notification.findByUserId(
      userId,
      false,
      1000
    ); // Limit to reasonable number

    if (unreadNotifications.length === 0) {
      return sendSuccessResponse(
        res,
        200,
        "No unread notifications to mark as read."
      );
    }

    const unreadIds = unreadNotifications.map((notif) => notif.id);
    const updated = await Notification.markAsRead(unreadIds);

    if (!updated) {
      return sendErrorResponse(
        res,
        400,
        ServerError.OPERATION_FAILED,
        "Failed to mark all notifications as read."
      );
    }

    sendSuccessResponse(
      res,
      200,
      "All notifications marked as read successfully."
    );
  } catch (error) {
    console.error(
      "Error marking all notifications as read:",
      error.message,
      error.stack
    );
    sendErrorResponse(
      res,
      500,
      ServerError.INTERNAL_SERVER_ERROR,
      "Failed to mark all notifications as read."
    );
  }
};

// @route   DELETE /api/notifications/:id
// @desc    Delete a specific notification
// @access  Private (Authenticated User - must own notification)
const deleteNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return sendErrorResponse(
        res,
        404,
        NotFoundError.NOTIFICATION_NOT_FOUND,
        "Notification not found."
      );
    }

    // Authorization: User must own the notification
    if (notification.user_id !== userId) {
      return sendErrorResponse(
        res,
        403,
        AuthorizationError.NOT_AUTHORIZED,
        "You are not authorized to delete this notification."
      );
    }

    const deleted = await Notification.delete(notificationId);

    if (!deleted) {
      return sendErrorResponse(
        res,
        400,
        ServerError.OPERATION_FAILED,
        "Failed to delete notification."
      );
    }

    sendSuccessResponse(res, 200, "Notification deleted successfully.");
  } catch (error) {
    console.error("Error deleting notification:", error.message, error.stack);
    sendErrorResponse(
      res,
      500,
      ServerError.INTERNAL_SERVER_ERROR,
      "Failed to delete notification."
    );
  }
};

// @route   DELETE /api/notifications/clear-all
// @desc    Delete all notifications for the authenticated user
// @access  Private (Authenticated User)
const deleteAllUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const deleted = await Notification.deleteAllForUser(userId);

    if (!deleted) {
      return sendSuccessResponse(
        res,
        200,
        "No notifications to delete for this user.",
        { deletedCount: 0 }
      );
    }

    sendSuccessResponse(res, 200, "All notifications deleted successfully.", {
      deletedCount: deleted.affectedRows,
    });
  } catch (error) {
    console.error(
      "Error deleting all user notifications:",
      error.message,
      error.stack
    );
    sendErrorResponse(
      res,
      500,
      ServerError.INTERNAL_SERVER_ERROR,
      "Failed to delete all notifications."
    );
  }
};

module.exports = {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllUserNotifications,
};
