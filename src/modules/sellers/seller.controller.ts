import {Response} from 'express';

import {AuthRequest} from '../../middleware/auth.middleware';

import {
  createSellerBasicProfile,
  getSellerProfile,
  getSellerRequirementById,
  getSellerRequirements,
  updateSellerProfile,
} from './seller.service';

export const createSellerBasicProfileController = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const {
      ownerName,
      businessName,
      businessType,
      gstRegistered,
      gstNumber,
      panNumber,
      phone,
      email,
    } = req.body;

    // Owner name
    if (!ownerName?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Owner / Contact Person is required',
      });
    }

    // Business name
    if (!businessName?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Company / Business Name is required',
      });
    }

    // Business type
    if (!businessType?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Business Type is required',
      });
    }

    // Phone
    if (!phone?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Business Phone is required',
      });
    }

    // GST
    if (
      gstRegistered === true &&
      !gstNumber?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          'GST Number is required when GST registered is Yes',
      });
    }

    const profile = await createSellerBasicProfile({
      userId,

      ownerName,

      businessName,

      businessType,

      gstRegistered: Boolean(gstRegistered),

      gstNumber,

      panNumber,

      phone,

      email,
    });

    return res.status(201).json({
      success: true,
      message:
        'Seller basic profile saved successfully',

      data: {
        profile,
      },
    });
  } catch (error: any) {
    console.error(
      '❌ CREATE SELLER BASIC PROFILE ERROR:',
      error,
    );

    return res.status(400).json({
      success: false,
      message:
        error?.message ||
        'Unable to save seller profile',
    });
  }
};

// GET SELLER PROFILE
export const getSellerProfileController = async (
    req: AuthRequest,
    res: Response,
  ) => {
    try {
      const userId = req.user?.userId;
  
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }
  
      const profile = await getSellerProfile(userId);
  
      return res.status(200).json({
        success: true,
        message: 'Seller profile fetched successfully',
        data: {
          profile,
        },
      });
    } catch (error: any) {
      console.error(
        '❌ GET SELLER PROFILE ERROR:',
        error,
      );
  
      return res.status(404).json({
        success: false,
        message:
          error?.message || 'Seller profile not found',
      });
    }
  };
  
  
  // UPDATE SELLER PROFILE
  export const updateSellerProfileController = async (
    req: AuthRequest,
    res: Response,
  ) => {
    try {
      const userId = req.user?.userId;
  
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }
  
      const {
        ownerName,
        businessName,
        businessType,
        gstRegistered,
        gstNumber,
        panNumber,
        phone,
        email,
      } = req.body;
  
      // Basic validations
      if (
        ownerName !== undefined &&
        !ownerName.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: 'Owner / Contact Person is required',
        });
      }
  
      if (
        businessName !== undefined &&
        !businessName.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: 'Company / Business Name is required',
        });
      }
  
      if (
        businessType !== undefined &&
        !businessType.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: 'Business Type is required',
        });
      }
  
      if (
        phone !== undefined &&
        !phone.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: 'Business Phone is required',
        });
      }
  
      if (
        gstRegistered === true &&
        gstNumber !== undefined &&
        !gstNumber.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            'GST Number is required when GST registered is Yes',
        });
      }
  
      const profile = await updateSellerProfile(
        userId,
        {
          ownerName,
          businessName,
          businessType,
          gstRegistered,
          gstNumber,
          panNumber,
          phone,
          email,
        },
      );
  
      return res.status(200).json({
        success: true,
        message: 'Seller profile updated successfully',
        data: {
          profile,
        },
      });
    } catch (error: any) {
      console.error(
        '❌ UPDATE SELLER PROFILE ERROR:',
        error,
      );
  
      return res.status(400).json({
        success: false,
        message:
          error?.message ||
          'Unable to update seller profile',
      });
    }
  };

  export const getSellerRequirementsController = async (
    req: AuthRequest,
    res: Response,
  ) => {
    try {
      const requirements = await getSellerRequirements();
  
      return res.status(200).json({
        success: true,
        message: 'Seller requirements fetched successfully',
        data: {
          requirements,
        },
      });
    } catch (error: any) {
      console.error('GET SELLER REQUIREMENTS ERROR:', error);
  
      return res.status(500).json({
        success: false,
        message:
          error?.message || 'Unable to fetch seller requirements',
      });
    }
  };

  export const getSellerRequirementByIdController = async (
    req: AuthRequest,
    res: Response,
  ) => {
    try {
      const requirementId = req.params.id;
  
      if (!requirementId) {
        return res.status(400).json({
          success: false,
          message: 'Requirement ID is required',
        });
      }
  
      const requirement =
        await getSellerRequirementById(requirementId);
  
      return res.status(200).json({
        success: true,
        message: 'Seller requirement fetched successfully',
        data: {
          requirement,
        },
      });
    } catch (error: any) {
      console.error(
        'GET SELLER REQUIREMENT BY ID ERROR:',
        error,
      );
  
      return res.status(404).json({
        success: false,
        message:
          error?.message || 'Requirement not found',
      });
    }
  };