import { prisma } from "../../config/database";
import { firebaseMessaging } from "../../config/firebase";

interface SaveDeviceTokenInput {
  userId: string;
  token: string;
  platform?: string;
  deviceName?: string;
}

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

/**
 * Send push notification to a user
 */
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
  // 1. Get active device tokens
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
      message: "No active device tokens found",
    };
  }

  const tokens = devices.map(
    (device) => device.token,
  );

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
          priority: "high",

          notification: {
            channelId: "default",
            sound: "default",
          },
        },

        apns: {
          payload: {
            aps: {
              sound: "default",
            },
          },
        },
      });

    console.log(
      "📨 Firebase response:",
      response.successCount,
      "success,",
      response.failureCount,
      "failed",
    );

    // 2. Deactivate invalid tokens
    const invalidTokenIds: string[] = [];

    response.responses.forEach(
      (result, index) => {
        if (!result.success) {
          console.error(
            "❌ FCM token failed:",
            tokens[index],
            result.error?.message,
          );

          const errorCode =
            result.error?.code;

          if (
            errorCode ===
              "messaging/registration-token-not-registered" ||
            errorCode ===
              "messaging/invalid-registration-token"
          ) {
            invalidTokenIds.push(
              devices[index].id,
            );
          }
        }
      },
    );

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
      "❌ SEND PUSH NOTIFICATION ERROR:",
      error,
    );

    throw error;
  }
};