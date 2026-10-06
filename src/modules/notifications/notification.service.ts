

import { prisma } from '../../config/database';
import {firebaseMessaging} from '../../config/firebase';

interface SaveDeviceTokenInput {
  userId: string;
  token: string;
  platform?: string;
  deviceName?: string;
}

/* =========================================================
   SAVE DEVICE TOKEN
========================================================= */

export const saveDeviceToken = async ({
  userId,
  token,
  platform,
  deviceName,
}: SaveDeviceTokenInput) => {
  const deviceToken = await prisma.userDeviceToken.upsert({
    where: {
      token,
    },

    update: {
      userId,
      platform,
      deviceName,
      isActive: true,
      lastUsedAt: new Date(),
    },

    create: {
      userId,
      token,
      platform,
      deviceName,
      isActive: true,
      lastUsedAt: new Date(),
    },
  });

  return deviceToken;
};

/* =========================================================
   DEACTIVATE DEVICE TOKEN
========================================================= */

export const deactivateDeviceToken = async (
  userId: string,
  token: string,
) => {
  return prisma.userDeviceToken.updateMany({
    where: {
      userId,
      token,
    },

    data: {
      isActive: false,
    },
  });
};

/* =========================================================
   SEND PUSH NOTIFICATION
========================================================= */

export const sendPushNotification = async ({
  userId,
  title,
  body,
  data,
}: {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}) => {
  // Get active device tokens
  const devices = await prisma.userDeviceToken.findMany({
    where: {
      userId,
      isActive: true,
    },

    select: {
      id: true,
      token: true,
    },
  });

  if (devices.length === 0) {
    return {
      success: false,
      sent: 0,
      failed: 0,
      message: 'No active device tokens found',
    };
  }

  const tokens = devices.map(device => device.token);

  console.log(
    `📲 Sending notification to ${tokens.length} device(s)`,
  );

  try {
    const response =
      await firebaseMessaging.sendEachForMulticast({
        tokens,

        notification: {
          title,
          body,
        },

        data: data ?? {},

        android: {
          priority: 'high',

          notification: {
            channelId: 'default',
            sound: 'default',
          },
        },

        apns: {
          payload: {
            aps: {
              sound: 'default',
            },
          },
        },
      });

    console.log(
      '📨 Firebase response:',
      response.successCount,
      'success,',
      response.failureCount,
      'failed',
    );

    /* =====================================================
       DEACTIVATE INVALID TOKENS
    ===================================================== */

    const invalidTokenIds: string[] = [];

    response.responses.forEach((result, index) => {
      if (!result.success) {
        console.error(
          '❌ FCM token failed:',
          tokens[index],
          result.error?.message,
        );

        const errorCode = result.error?.code;

        if (
          errorCode ===
            'messaging/registration-token-not-registered' ||
          errorCode ===
            'messaging/invalid-registration-token'
        ) {
          invalidTokenIds.push(devices[index].id);
        }
      }
    });

    if (invalidTokenIds.length > 0) {
      await prisma.userDeviceToken.updateMany({
        where: {
          id: {
            in: invalidTokenIds,
          },
        },

        data: {
          isActive: false,
        },
      });

      console.log(
        `🧹 Deactivated ${invalidTokenIds.length} invalid token(s)`,
      );
    }

    return {
      success: response.successCount > 0,
      sent: response.successCount,
      failed: response.failureCount,
    };
  } catch (error) {
    console.error(
      '❌ SEND PUSH NOTIFICATION ERROR:',
      error,
    );

    throw error;
  }
};

/* =========================================================
   CREATE NOTIFICATION
   DB NOTIFICATION + PUSH NOTIFICATION
========================================================= */

export const createNotification = async ({
  userId,
  title,
  body,
  type,
  data,
}: {
  userId: string;
  title: string;
  body: string;
  type: string;
  data?: Record<string, string>;
}) => {
  /*
   * First save notification in DB.
   *
   * This makes sure notification history exists
   * even if FCM push fails.
   */

  const notification = await prisma.notification.create({
    data: {
      userId,
      title,
      body,
      type,
      data: data ?? {},
    },
  });

  /*
   * Then send push notification.
   *
   * Push failure should NOT delete DB notification.
   */

  try {
    await sendPushNotification({
      userId,
      title,
      body,

      data: {
        ...(data ?? {}),

        notificationId: notification.id,
        type,
      },
    });
  } catch (error) {
    console.error(
      '❌ PUSH FAILED BUT NOTIFICATION WAS SAVED:',
      error,
    );
  }

  return notification;
};

/* =========================================================
   GET MY NOTIFICATIONS
========================================================= */

export const getMyNotifications = async (
  userId: string,
) => {
  const notifications = await prisma.notification.findMany({
    where: {
      userId,
    },

    orderBy: {
      createdAt: 'desc',
    },
  });

  const unreadCount = await prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });

  return {
    notifications,
    unreadCount,
  };
};
/* =========================================================
   MARK ONE AS READ
========================================================= */

export const markNotificationAsRead = async (
  userId: string,
  notificationId: string,
) => {
  const result =
    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },

      data: {
        isRead: true,
      },
    });

  if (result.count === 0) {
    throw new Error('Notification not found');
  }

  return {
    success: true,
  };
};

/* =========================================================
   MARK ALL AS READ
========================================================= */

export const markAllNotificationsAsRead = async (
  userId: string,
) => {
  await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },

    data: {
      isRead: true,
    },
  });

  return {
    success: true,
  };
};

/* =========================================================
   DELETE NOTIFICATION
========================================================= */

export const deleteNotification = async (
  userId: string,
  notificationId: string,
) => {
  const result =
    await prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId,
      },
    });

  if (result.count === 0) {
    throw new Error('Notification not found');
  }

  return {
    success: true,
  };
};

/* =========================================================
   DELETE ALL NOTIFICATIONS
========================================================= */

export const deleteAllNotifications = async (
  userId: string,
) => {
  await prisma.notification.deleteMany({
    where: {
      userId,
    },
  });

  return {
    success: true,
  };
};