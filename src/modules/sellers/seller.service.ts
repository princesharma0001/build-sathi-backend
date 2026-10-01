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