import { Response } from "express";

import { AuthRequest } from "../../middleware/auth.middleware";

import { confirmMaterialReceivedService, createOrUpdateBuyerProfile, getBuyerOrdersService, getBuyerProfile } from "./buyer.service";

export const saveBuyerProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const {
      name,
      phoneNumber,
      companyName,
      state,
      city,
      pincode,
      completeAddress,
    } = req.body || {};
    // Full name validation
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Full name is required",
      });
    }

    if (name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Full name must be at least 2 characters",
      });
    }

    if (!state || !city || !pincode || !completeAddress) {
      return res.status(400).json({
        success: false,
        message: "State, city, pincode and complete address are required",
      });
    }

    if (!/^\d{6}$/.test(pincode)) {
      return res.status(400).json({
        success: false,
        message: "Pincode must be exactly 6 digits",
      });
    }

    if (
      phoneNumber &&
      !/^[+]?[0-9]{10,15}$/.test(phoneNumber.replace(/\s/g, ""))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number",
      });
    }

    const result = await createOrUpdateBuyerProfile(userId, {
      name: name.trim(),
      phoneNumber: phoneNumber?.trim() || undefined,
      companyName: companyName?.trim() || undefined,
      state: state.trim(),
      city: city.trim(),
      pincode: pincode.trim(),
      completeAddress: completeAddress.trim(),
    });

    return res.status(200).json({
      success: true,
      message: "Buyer profile saved successfully",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Unable to save buyer profile",
    });
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const result = await getBuyerProfile(userId);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Unable to get buyer profile",
    });
  }
};

export const getBuyerOrdersController = async (
  req: any,
  res: any,
) => {
  try {
    console.log('REQ USER:', req.user);

    const buyerId = req.user.id;

    console.log('BUYER ID:', buyerId);

    const orders = await getBuyerOrdersService(buyerId);

    return res.status(200).json({
      success: true,
      message: 'Buyer orders fetched successfully',
      data: orders,
    });
  } catch (error: any) {
    console.error('GET BUYER ORDERS ERROR:', error);

    return res.status(500).json({
      success: false,
      message: error?.message || 'Failed to fetch buyer orders',
    });
  }
};

export const confirmMaterialReceivedController = async (
  req: any,
  res: any,
) => {
  try {
    const buyerId = req.user.userId; // apne authMiddleware ke according change karein
    const {orderId} = req.params;

    if (!buyerId) {
      return res.status(401).json({
        success: false,
        message: 'Buyer ID not found',
      });
    }

    const order = await confirmMaterialReceivedService(
      buyerId,
      orderId,
    );

    return res.status(200).json({
      success: true,
      message: 'Material received successfully',
      data: order,
    });
  } catch (error: any) {
    console.error(
      'CONFIRM MATERIAL RECEIVED ERROR:',
      error,
    );

    return res.status(400).json({
      success: false,
      message:
        error?.message ||
        'Failed to confirm material received',
    });
  }
};
