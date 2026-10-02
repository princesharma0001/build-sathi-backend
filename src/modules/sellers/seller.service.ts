import { prisma } from "../../config/database";

interface CreateSellerBasicProfileData {
  userId: string;
  ownerName: string;
  businessName: string;
  businessType: string;
  gstRegistered: boolean;
  gstNumber?: string;
  panNumber?: string;
  phone: string;
  email?: string;
  
}

// UPDATE SELLER PROFILE
interface UpdateSellerProfileData {
  ownerName?: string;
  businessName?: string;
  businessType?: string;
  gstRegistered?: boolean;
  gstNumber?: string;
  panNumber?: string;
  phone?: string;
  email?: string;
}

// GET SELLER PROFILE
export const getSellerProfile = async (userId: string) => {
  const profile = await prisma.sellerProfile.findUnique({
    where: {
      userId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
        },
      },
    },
  });

  if (!profile) {
    throw new Error("Seller profile not found");
  }

  return profile;
};

export const updateSellerProfile = async (
  userId: string,
  data: UpdateSellerProfileData
) => {
  const existingProfile = await prisma.sellerProfile.findUnique({
    where: {
      userId,
    },
  });

  if (!existingProfile) {
    throw new Error("Seller profile not found");
  }

  const ownerName = data.ownerName?.trim();
  const businessName = data.businessName?.trim();
  const businessType = data.businessType?.trim();

  const gstRegistered =
    data.gstRegistered !== undefined
      ? data.gstRegistered
      : existingProfile.gstRegistered;

  const gstNumber = data.gstNumber?.trim().toUpperCase();
  const panNumber = data.panNumber?.trim().toUpperCase();
  const phone = data.phone?.trim();
  const email = data.email?.trim().toLowerCase();

  // GST validation
  if (gstRegistered && !gstNumber && !existingProfile.gstNumber) {
    throw new Error("GST number is required when GST is registered");
  }

  const finalGstNumber = gstNumber ?? existingProfile.gstNumber;

  if (
    gstRegistered &&
    finalGstNumber &&
    !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(finalGstNumber)
  ) {
    throw new Error("Invalid GST number");
  }

  // PAN validation
  const finalPanNumber = panNumber ?? existingProfile.panNumber;

  if (finalPanNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(finalPanNumber)) {
    throw new Error("Invalid PAN number");
  }

  // Phone validation
  if (phone && !/^[6-9][0-9]{9}$/.test(phone)) {
    throw new Error(
      "Phone number must be a valid 10 digit Indian mobile number"
    );
  }

  const profile = await prisma.sellerProfile.update({
    where: {
      userId,
    },
    data: {
      ...(ownerName !== undefined && {
        ownerName,
      }),

      ...(businessName !== undefined && {
        businessName,
      }),

      ...(businessType !== undefined && {
        businessType,
      }),

      gstRegistered,

      gstNumber: gstRegistered ? finalGstNumber || null : null,

      panNumber: finalPanNumber || null,

      ...(phone !== undefined && {
        phone,
      }),

      ...(email !== undefined && {
        email: email || null,
      }),
    },
  });

  return profile;
};

export const createSellerBasicProfile = async (
  data: CreateSellerBasicProfileData
) => {
  const {
    userId,
    ownerName,
    businessName,
    businessType,
    gstRegistered,
    gstNumber,
    panNumber,
    phone,
    email,
  } = data;

  // Check user
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Only SELLER
  if (user.role !== "SELLER") {
    throw new Error("Only seller users can create seller profile");
  }

  // Check existing profile
  const existingProfile = await prisma.sellerProfile.findUnique({
    where: {
      userId,
    },
  });

  if (existingProfile) {
    throw new Error("Seller basic profile already exists");
  }

  // GST validation
  if (gstRegistered && !gstNumber?.trim()) {
    throw new Error("GST number is required when GST is registered");
  }

  if (
    gstRegistered &&
    gstNumber &&
    !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(
      gstNumber.trim().toUpperCase()
    )
  ) {
    throw new Error("Invalid GST number");
  }

  // PAN validation
  if (
    panNumber &&
    !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panNumber.trim().toUpperCase())
  ) {
    throw new Error("Invalid PAN number");
  }

  // Phone validation
  if (!/^[6-9][0-9]{9}$/.test(phone.trim())) {
    throw new Error(
      "Phone number must be a valid 10 digit Indian mobile number"
    );
  }

  const profile = await prisma.sellerProfile.create({
    data: {
      userId,

      ownerName: ownerName.trim(),

      businessName: businessName.trim(),

      businessType: businessType.trim(),

      gstRegistered,

      gstNumber: gstRegistered ? gstNumber?.trim().toUpperCase() || null : null,

      panNumber: panNumber ? panNumber.trim().toUpperCase() : null,

      phone: phone.trim(),

      email: email?.trim().toLowerCase() || null,
    },
  });

  return profile;
};

export const getSellerRequirements = async () => {
    const requirements = await prisma.requirement.findMany({
      where: {
        status: {
          in: ['OPEN', 'QUOTED'],
        },
      },
  
      orderBy: {
        createdAt: 'desc',
      },
  
      include: {
        buyer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
  
        material: {
          include: {
            category: true,
          },
        },
  
        deliveryAddress: {
          select: {
            id: true,
            state: true,
            city: true,
            pincode: true,
            addressLine1: true,
            addressLine2: true,
            landmark: true,
          },
        },
      },
    });
  
    return requirements;
  };

  export const getSellerRequirementById = async (
    requirementId: string,
  ) => {
    const requirement = await prisma.requirement.findUnique({
      where: {
        id: requirementId,
      },
      include: {
        buyer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
  
        material: {
          include: {
            category: true,
          },
        },
  
        deliveryAddress: {
          select: {
            id: true,
            state: true,
            city: true,
            pincode: true,
            addressLine1: true,
            addressLine2: true,
            landmark: true,
          },
        },
      },
    });
  
    if (!requirement) {
      throw new Error('Requirement not found');
    }
  
    return requirement;
  };


export const getSellerDashboard = async (sellerId: string) => {
  const now = new Date();

  // First day of current month
  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  );

  // Last day of current month
  const startOfNextMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    1,
  );

  // ==========================================
  // SELLER PROFILE
  // ==========================================

  const seller = await prisma.user.findUnique({
    where: {
      id: sellerId,
    },

    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,

      sellerProfile: {
        select: {
          ownerName: true,
          businessName: true,
          businessType: true,
          gstRegistered: true,
          gstNumber: true,
          panNumber: true,
          phone: true,
          email: true,
        },
      },
    },
  });

  if (!seller) {
    throw new Error('Seller not found');
  }

  if (seller.role !== 'SELLER') {
    throw new Error('User is not a seller');
  }

  // ==========================================
  // DASHBOARD COUNTS
  // ==========================================

  const [
    totalRequirements,
    openRequirements,
    pendingQuotations,
    acceptedQuotations,
    rejectedQuotations,
    activeOrders,
    completedOrders,
    cancelledRequirements,
  ] = await Promise.all([
    // Total requirements on platform
    prisma.requirement.count(),

    // Requirements currently available for sellers
    prisma.requirement.count({
      where: {
        status: 'OPEN',
      },
    }),

    // Seller's pending quotations
    prisma.quote.count({
      where: {
        sellerId,
        status: 'PENDING',
      },
    }),

    // Seller's accepted quotations
    prisma.quote.count({
      where: {
        sellerId,
        status: 'ACCEPTED',
      },
    }),

    // Seller's rejected quotations
    prisma.quote.count({
      where: {
        sellerId,
        status: 'REJECTED',
      },
    }),

    // Requirements where this seller's quote was accepted
    // and requirement is currently ORDERED
    prisma.requirement.count({
      where: {
        status: 'ORDERED',

        quotes: {
          some: {
            sellerId,
            status: 'ACCEPTED',
          },
        },
      },
    }),

    // Completed requirements for this seller
    prisma.requirement.count({
      where: {
        status: 'COMPLETED',

        quotes: {
          some: {
            sellerId,
            status: 'ACCEPTED',
          },
        },
      },
    }),

    // Cancelled requirements for this seller
    prisma.requirement.count({
      where: {
        status: 'CANCELLED',

        quotes: {
          some: {
            sellerId,
            status: 'ACCEPTED',
          },
        },
      },
    }),
  ]);

  // ==========================================
  // SALES
  // ==========================================

  const totalSalesResult = await prisma.quote.aggregate({
    where: {
      sellerId,
      status: 'ACCEPTED',
    },

    _sum: {
      totalAmount: true,
    },
  });

  const thisMonthSalesResult = await prisma.quote.aggregate({
    where: {
      sellerId,
      status: 'ACCEPTED',

      createdAt: {
        gte: startOfMonth,
        lt: startOfNextMonth,
      },
    },

    _sum: {
      totalAmount: true,
    },
  });

  const totalSales = Number(
    totalSalesResult._sum.totalAmount || 0,
  );

  const thisMonthSales = Number(
    thisMonthSalesResult._sum.totalAmount || 0,
  );

  // ==========================================
  // POPULAR MATERIALS
  // ==========================================

  const popularMaterialsRaw =
    await prisma.requirement.groupBy({
      by: ['materialId'],

      _count: {
        materialId: true,
      },

      orderBy: {
        _count: {
          materialId: 'desc',
        },
      },

      take: 5,
    });

  const popularMaterialIds =
    popularMaterialsRaw.map(
      item => item.materialId,
    );

  const popularMaterialDetails =
    popularMaterialIds.length
      ? await prisma.material.findMany({
          where: {
            id: {
              in: popularMaterialIds,
            },
          },

          select: {
            id: true,
            name: true,
            unit: true,
            imageUrl: true,

            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })
      : [];

  const popularMaterials =
    popularMaterialsRaw.map(item => {
      const material =
        popularMaterialDetails.find(
          m => m.id === item.materialId,
        );

      return {
        id: item.materialId,
        name: material?.name || 'Unknown Material',
        unit: material?.unit || null,
        imageUrl: material?.imageUrl || null,
        category: material?.category?.name || null,
        requirementCount:
          item._count.materialId,
      };
    });

  // ==========================================
  // RECENT REQUIREMENTS
  // ==========================================

  const recentRequirements =
    await prisma.requirement.findMany({
      where: {
        status: {
          in: [
            'OPEN',
            'QUOTED',
            'ACCEPTED',
            'ORDERED',
          ],
        },
      },

      orderBy: {
        createdAt: 'desc',
      },

      take: 5,

      select: {
        id: true,
        quantity: true,
        unit: true,
        deliveryPreference: true,
        notes: true,
        status: true,
        createdAt: true,

        material: {
          select: {
            id: true,
            name: true,
            unit: true,

            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },

        buyer: {
          select: {
            id: true,
            name: true,
            phone: true,

            buyerProfile: {
              select: {
                phoneNumber: true,
                companyName: true,
                state: true,
                city: true,
              },
            },
          },
        },

        deliveryAddress: {
          select: {
            id: true,
            name: true,
            phone: true,
            addressLine1: true,
            addressLine2: true,
            landmark: true,
            city: true,
            state: true,
            pincode: true,
          },
        },

        quotes: {
          where: {
            sellerId,
          },

          select: {
            id: true,
            status: true,
            totalAmount: true,
            createdAt: true,
          },
        },
      },
    });

  // ==========================================
  // SELLER QUOTATION SUMMARY
  // ==========================================

  const totalQuotes = await prisma.quote.count({
    where: {
      sellerId,
    },
  });

  const responseRate =
    totalQuotes > 0
      ? Math.round(
          ((totalQuotes -
            rejectedQuotations) /
            totalQuotes) *
            100,
        )
      : 0;

  // ==========================================
  // QUOTA
  // ==========================================

  const activeSubscription =
    await prisma.sellerSubscription.findFirst({
      where: {
        sellerId,
        status: 'ACTIVE',

        OR: [
          {
            expiresAt: null,
          },
          {
            expiresAt: {
              gt: now,
            },
          },
        ],
      },

      orderBy: {
        createdAt: 'desc',
      },

      select: {
        id: true,
        quotationsTotal: true,
        quotationsRemaining: true,
        hasTrustedBadge: true,
        startsAt: true,
        expiresAt: true,

        plan: {
          select: {
            id: true,
            code: true,
            name: true,
            quotationLimit: true,
          },
        },
      },
    });

  // ==========================================
  // FINAL RESPONSE
  // ==========================================

  return {
    seller: {
      id: seller.id,
      name: seller.name,
      email: seller.email,
      phone: seller.phone,

      status: seller.status,

      profile: seller.sellerProfile,
    },

    stats: {
      totalRequirements,
      openRequirements,

      pendingQuotations,
      acceptedQuotations,
      rejectedQuotations,

      activeOrders,
      completedOrders,
      cancelledOrders: cancelledRequirements,

      totalSales,
      thisMonthSales,

      responseRate: `${responseRate}%`,
    },

    popularMaterials,

    recentRequirements: recentRequirements.map(
      requirement => ({
        id: requirement.id,

        material: requirement.material,

        quantity: Number(
          requirement.quantity,
        ),

        unit: requirement.unit,

        deliveryPreference:
          requirement.deliveryPreference,

        notes: requirement.notes,

        status: requirement.status,

        createdAt: requirement.createdAt,

        buyer: {
          id: requirement.buyer.id,
          name: requirement.buyer.name,
          phone:
            requirement.buyer
              .buyerProfile?.phoneNumber ||
            requirement.buyer.phone,

          companyName:
            requirement.buyer
              .buyerProfile?.companyName,

          city:
            requirement.buyer
              .buyerProfile?.city,

          state:
            requirement.buyer
              .buyerProfile?.state,
        },

        deliveryAddress:
          requirement.deliveryAddress,

        sellerQuote:
          requirement.quotes[0] || null,
      }),
    ),

    subscription: activeSubscription
      ? {
          id: activeSubscription.id,
          plan: activeSubscription.plan,
          quotationsTotal:
            activeSubscription.quotationsTotal,
          quotationsRemaining:
            activeSubscription.quotationsRemaining,
          hasTrustedBadge:
            activeSubscription.hasTrustedBadge,
          startsAt:
            activeSubscription.startsAt,
          expiresAt:
            activeSubscription.expiresAt,
        }
      : null,
  };
};