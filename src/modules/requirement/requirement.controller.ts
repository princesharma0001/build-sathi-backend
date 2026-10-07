import { Request, Response } from "express";
import {
  createRequirement,
  getBuyerRequirementById,
  getBuyerRequirements,
} from "./requirement.service";
import { AuthRequest } from "../../middleware/auth.middleware";

export const createRequirementController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.user?.userId;

    console.log("👤 REQUIREMENT USER:", req.user);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const {
      materialId,
      deliveryAddressId,
      quantity,
      unit,
      deliveryPreference,
      notes,
    } = req.body;

    console.log("📦 REQUIREMENT BODY:", req.body);
    console.log("👤 BUYER ID:", userId);

    if (!materialId) {
      return res.status(400).json({
        success: false,
        message: "Material is required",
      });
    }

    if (!deliveryAddressId) {
      return res.status(400).json({
        success: false,
        message: "Delivery address is required",
      });
    }

    if (!quantity) {
      return res.status(400).json({
        success: false,
        message: "Quantity is required",
      });
    }

    if (!unit) {
      return res.status(400).json({
        success: false,
        message: "Unit is required",
      });
    }

    if (!deliveryPreference) {
      return res.status(400).json({
        success: false,
        message: "Delivery preference is required",
      });
    }

    const requirement = await createRequirement({
      buyerId: userId,
      materialId,
      deliveryAddressId,
      quantity: Number(quantity),
      unit,
      deliveryPreference,
      notes,
    });

    return res.status(201).json({
      success: true,
      message: "Requirement posted successfully",
      data: {
        requirement,
      },
    });
  } catch (error: any) {
    console.error("❌ CREATE REQUIREMENT ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error?.message || "Unable to create requirement",
    });
  }
};

export const getBuyerRequirementsController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const buyerId = req.user?.userId;

    if (!buyerId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const requirements = await getBuyerRequirements(buyerId);

    return res.status(200).json({
      success: true,
      data: {
        requirements,
      },
    });
  } catch (error: any) {
    console.error("❌ GET BUYER REQUIREMENTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error?.message || "Unable to fetch requirements",
    });
  }
};

export const getBuyerRequirementByIdController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const buyerId = req.user?.userId;
    const requirementId = req.params.id;

    if (!buyerId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (typeof requirementId !== "string" || !requirementId.trim()) {
      return res.status(400).json({
        success: false,
        message: "Requirement ID is required",
      });
    }

    const requirement = await getBuyerRequirementById(buyerId, requirementId);

    return res.status(200).json({
      success: true,
      data: {
        requirement,
      },
    });
  } catch (error: any) {
    console.error("❌ GET REQUIREMENT DETAILS ERROR:", error);

    return res.status(404).json({
      success: false,
      message: error?.message || "Requirement not found",
    });
  }
};
