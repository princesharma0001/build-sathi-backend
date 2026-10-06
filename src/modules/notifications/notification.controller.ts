import { Request, Response } from "express";
import {
  saveDeviceToken,
  deactivateDeviceToken,
  sendPushNotification,
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "./notification.service";

export const registerDeviceToken = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const {
      token,
      platform,
      deviceName,
    } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "FCM token is required",
      });
    }

    const deviceToken = await saveDeviceToken({
      userId,
      token,
      platform,
      deviceName,
    });

    return res.status(200).json({
      success: true,
      message: "Device token registered successfully",
      data: {
        id: deviceToken.id,
      },
    });
  } catch (error) {
    console.error("REGISTER DEVICE TOKEN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to register device token",
    });
  }
};

export const removeDeviceToken = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "FCM token is required",
      });
    }

    await deactivateDeviceToken(userId, token);

    return res.status(200).json({
      success: true,
      message: "Device token removed successfully",
    });
  } catch (error) {
    console.error("REMOVE DEVICE TOKEN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to remove device token",
    });
  }
};

export const sendTestNotification = async (
    req: Request,
    res: Response,
  ) => {
    try {
      const senderUserId = (req as any).user?.userId;
  
      if (!senderUserId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }
  
      const {
        userId,
        title,
        body,
      } = req.body;
  
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "userId is required",
        });
      }
  
      if (!title) {
        return res.status(400).json({
          success: false,
          message: "title is required",
        });
      }
  
      if (!body) {
        return res.status(400).json({
          success: false,
          message: "body is required",
        });
      }
  
      const result =
        await sendPushNotification({
          userId,
          title,
          body,
          data: {
            type: "TEST_NOTIFICATION",
          },
        });
  
      return res.status(200).json({
        success: true,
        message:
          "Test notification sent successfully",
        data: result,
      });
    } catch (error) {
      console.error(
        "SEND TEST NOTIFICATION ERROR:",
        error,
      );
  
      return res.status(500).json({
        success: false,
        message:
          "Failed to send test notification",
      });
    }
  };

  export const getMyNotificationsController = async (
    req: Request,
    res: Response,
  ) => {
    try {
      const userId = (req as any).user?.userId;
  
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }
  
      const result = await getMyNotifications(userId);
  
      return res.status(200).json({
        success: true,
        message: 'Notifications fetched successfully',
        data: result,
      });
    } catch (error) {
      console.error(
        '❌ GET NOTIFICATIONS ERROR:',
        error,
      );
  
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch notifications',
      });
    }
  };

  export const markNotificationAsReadController = async (
    req: Request,
    res: Response,
  ) => {
    try {
      const userId = (req as any).user?.userId;
      const {id} = req.params;
  
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }
  
      await markNotificationAsRead(userId, id);
  
      return res.status(200).json({
        success: true,
        message: 'Notification marked as read',
      });
    } catch (error) {
      console.error(
        '❌ MARK NOTIFICATION READ ERROR:',
        error,
      );
  
      return res.status(500).json({
        success: false,
        message: 'Failed to mark notification as read',
      });
    }
  };

  export const markAllNotificationsAsReadController = async (
    req: Request,
    res: Response,
  ) => {
    try {
      const userId = (req as any).user?.userId;
  
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }
  
      await markAllNotificationsAsRead(userId);
  
      return res.status(200).json({
        success: true,
        message: 'All notifications marked as read',
      });
    } catch (error) {
      console.error(
        '❌ MARK ALL NOTIFICATIONS ERROR:',
        error,
      );
  
      return res.status(500).json({
        success: false,
        message: 'Failed to mark all notifications as read',
      });
    }
  };