import { prisma } from "../../config/database";
import { createNotification, sendPushNotification } from "../notifications/notification.service";

interface CreateRequirementData {
  buyerId: string;
  materialId: string;
  deliveryAddressId: string;
  quantity: number;
  unit: string;
  deliveryPreference: string;
  notes?: string;
}

export const createRequirement = async (data: CreateRequirementData) => {
  const {
    buyerId,
    materialId,
    deliveryAddressId,
    quantity,
    unit,
    deliveryPreference,
    notes,
  } = data;

  // Verify material
  const material = await prisma.material.findFirst({
    where: {
      id: materialId,
      isActive: true,
    },
  });

  if (!material) {
    throw new Error("Material not found or inactive");
  }

  // Verify delivery address belongs to buyer
  const address = await prisma.deliveryAddress.findFirst({
    where: {
      id: deliveryAddressId,
      userId: buyerId,
    },
  });

  if (!address) {
    throw new Error("Delivery address not found");
  }

  // Validate quantity
  if (!quantity || quantity <= 0) {
    throw new Error("Quantity must be greater than zero");
  }

  // Create requirement
  const requirement = await prisma.requirement.create({
    data: {
      buyerId,
      materialId,
      deliveryAddressId,
      quantity,
      unit,
      deliveryPreference,
      notes: notes?.trim() || null,
      status: "OPEN",
    },

    include: {
      material: {
        include: {
          category: true,
        },
      },

      deliveryAddress: true,

      buyer: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  // ========================================
  // SEND NOTIFICATION TO SELLERS
  // ========================================

  try {
    const sellers = await prisma.user.findMany({
      where: {
        role: "SELLER",
        status: "ACTIVE",
      },
      select: {
        id: true,
      },
    });

    await Promise.all(
      sellers.map((seller) =>
        createNotification({
          userId: seller.id,
    
          title: 'New Requirement 🔔',
          body: `${requirement.material.name} requirement received. ${quantity} ${unit} required.`,
    
          type: 'NEW_REQUIREMENT',
    
          data: {
            requirementId: requirement.id,
            materialId,
            screen: 'SellerRequirementDetails',
          },
        }),
      ),
    );
    console.log(
      `✅ New requirement notification sent to ${sellers.length} seller(s)`
    );
  } catch (notificationError) {
    console.error("❌ REQUIREMENT NOTIFICATION ERROR:", notificationError);
  }

  return requirement;
};

export const getBuyerRequirements = async (buyerId: string) => {
  return prisma.requirement.findMany({
    where: {
      buyerId,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      material: {
        include: {
          category: true,
        },
      },
      deliveryAddress: true,
    },
  });
};

export const getBuyerRequirementById = async (
  buyerId: string,
  requirementId: string
) => {
  const requirement = await prisma.requirement.findFirst({
    where: {
      id: requirementId,
      buyerId,
    },
    include: {
      material: {
        include: {
          category: true,
        },
      },
      deliveryAddress: true,
    },
  });

  if (!requirement) {
    throw new Error("Requirement not found");
  }

  return requirement;
};
