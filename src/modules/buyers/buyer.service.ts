import { prisma } from '../../config/database';
import { createNotification, sendPushNotification } from '../notifications/notification.service';

interface BuyerProfileData {
  name: string;
  phoneNumber?: string;
  companyName?: string;
  state: string;
  city: string;
  pincode: string;
  completeAddress: string;
}

export const createOrUpdateBuyerProfile = async (
    userId: string,
    data: BuyerProfileData,
  ) => {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
  
    if (!user) {
      throw new Error('User not found');
    }
  
    if (user.role !== 'BUYER') {
      throw new Error(
        'Only buyer can create buyer profile',
      );
    }
  
    // UPDATE USER NAME
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        name: data.name,
      },
    });
  
    // CREATE / UPDATE BUYER PROFILE
    const profile =
      await prisma.buyerProfile.upsert({
        where: {
          userId,
        },
  
        create: {
          userId,
          phoneNumber: data.phoneNumber,
          companyName: data.companyName,
          state: data.state,
          city: data.city,
          pincode: data.pincode,
          completeAddress:
            data.completeAddress,
        },
  
        update: {
          phoneNumber: data.phoneNumber,
          companyName: data.companyName,
          state: data.state,
          city: data.city,
          pincode: data.pincode,
          completeAddress:
            data.completeAddress,
        },
      });
  
    return {
      profile: {
        id: profile.id,
        name: data.name,
        phoneNumber: profile.phoneNumber,
        email: user.email,
        companyName: profile.companyName,
        state: profile.state,
        city: profile.city,
        pincode: profile.pincode,
        completeAddress:
          profile.completeAddress,
      },
    };
  };

export const getBuyerProfile = async (
  userId: string,
) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      buyerProfile: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.role !== 'BUYER') {
    throw new Error(
      'Only buyer can access buyer profile',
    );
  }

  return {
    profile: {
      id: user.buyerProfile?.id || null,
      name: user.name,
      phoneNumber:
        user.buyerProfile?.phoneNumber ||
        user.phone ||
        null,
      email: user.email,
      companyName:
        user.buyerProfile?.companyName || null,
      state:
        user.buyerProfile?.state || null,
      city:
        user.buyerProfile?.city || null,
      pincode:
        user.buyerProfile?.pincode || null,
      completeAddress:
        user.buyerProfile?.completeAddress ||
        null,
    },
  };
};

export const getBuyerOrdersService = async (buyerId: string) => {
  const orders = await prisma.order.findMany({
    where: {
      buyerId,
    },

    orderBy: {
      createdAt: 'desc',
    },

    include: {
      material: true,

      seller: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,

          sellerProfile: {
            select: {
              id: true,
              ownerName: true,
              businessName: true,
              businessType: true,
              phone: true,
              email: true,
            },
          },
        },
      },

      deliveryAddress: true,

      quote: true,
    },
  });

  return orders;
};

export const confirmMaterialReceivedService = async (
  buyerId: string,
  orderId: string,
) => {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      buyerId,
    },
    select: {
      id: true,
      buyerId: true,
      sellerId: true,
      status: true,
    },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  if (order.status !== 'DISPATCHED') {
    throw new Error(
      `Material cannot be received when order status is ${order.status}`,
    );
  }

  // 1. Update order status
  const updatedOrder = await prisma.order.update({
    where: {
      id: orderId,
    },
    data: {
      status: 'DELIVERED',
    },
  });

  // 2. Notify Buyer
  try {
    await createNotification({
      userId: order.buyerId,
      title: 'Material Received',
      body: 'You have successfully confirmed that the material has been received.',
      type: 'ORDER_DELIVERED',
    
      data: {
        orderId: order.id,
        screen: 'OrderDetails',
      },
    });
   
  } catch (error) {
    console.error(
      '❌ Failed to send buyer delivery notification:',
      error,
    );
  }

  // 3. Notify Seller
  if (order.sellerId) {
    try {
      await createNotification({
        userId: order.sellerId,
        title: 'Material Delivered',
        body: 'The buyer has confirmed that the material has been received.',
        type: 'ORDER_DELIVERED',
        data: {
          orderId: order.id,
          screen: 'SellerOrderDetails',
        },
      });
      
    } catch (error) {
      console.error(
        '❌ Failed to send seller delivery notification:',
        error,
      );
    }
  }

  return updatedOrder;
};

// export const confirmMaterialReceivedService = async (
//   buyerId: string,
//   orderId: string,
// ) => {
//   const order = await prisma.order.findFirst({
//     where: {
//       id: orderId,
//       buyerId,
//     },
//   });

//   if (!order) {
//     throw new Error('Order not found');
//   }

//   if (order.status !== 'DISPATCHED') {
//     throw new Error(
//       `Material cannot be received when order status is ${order.status}`,
//     );
//   }

//   const updatedOrder = await prisma.order.update({
//     where: {
//       id: orderId,
//     },
//     data: {
//       status: 'DELIVERED',
//     },
//   });

//   return updatedOrder;
// };