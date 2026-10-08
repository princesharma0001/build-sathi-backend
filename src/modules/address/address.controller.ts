import { Response } from "express";

import { AuthRequest } from "../../middleware/auth.middleware";

import {
  createDeliveryAddress,
  deleteDeliveryAddress,
  getDeliveryAddressById,
  getDeliveryAddresses,
  setDefaultDeliveryAddress,
  updateDeliveryAddress,
} from "./address.service";

/* =========================================================
   GET ALL ADDRESSES
   GET /addresses
========================================================= */

export const getAddresses = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const addresses = await getDeliveryAddresses(userId);

    return res.status(200).json({
      success: true,
      message: "Delivery addresses fetched successfully",
      data: {
        addresses,
      },
    });
  } catch (error) {
    console.log("GET ADDRESSES ERROR:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to get delivery addresses",
    });
  }
};

/* =========================================================
   GET SINGLE ADDRESS
   GET /addresses/:id
========================================================= */

export const getAddress = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const id = req.params.id;

    if (typeof id !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid address ID",
      });
    }

    const address = await getDeliveryAddressById(userId, id);

    return res.status(200).json({
      success: true,
      message: "Delivery address fetched successfully",
      data: {
        address,
      },
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to get delivery address",
    });
  }
};

/* =========================================================
   CREATE ADDRESS
   POST /addresses
========================================================= */

export const saveAddress = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const {
      label,
      name,
      phone,
      addressLine1,
      addressLine2,
      landmark,
      city,
      state,
      pincode,
      isDefault,
    } = req.body || {};

    /* -------------------------
       REQUIRED VALIDATION
    ------------------------- */

    if (!name || !phone || !addressLine1 || !city || !state || !pincode) {
      return res.status(400).json({
        success: false,
        message: "Name, phone, address, city, state and pincode are required",
      });
    }

    const cleanPhone = String(phone).replace(/\s/g, "");

    if (!/^[+]?[0-9]{10,15}$/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number",
      });
    }

    const cleanPincode = String(pincode).trim();

    if (!/^\d{6}$/.test(cleanPincode)) {
      return res.status(400).json({
        success: false,
        message: "Pincode must be exactly 6 digits",
      });
    }

    const address = await createDeliveryAddress(userId, {
      label,
      name: String(name),
      phone: cleanPhone,
      addressLine1: String(addressLine1),
      addressLine2,
      landmark,
      city: String(city),
      state: String(state),
      pincode: cleanPincode,
      isDefault: Boolean(isDefault),
    });

    return res.status(201).json({
      success: true,
      message: "Delivery address saved successfully",
      data: {
        address,
      },
    });
  } catch (error) {
    console.log("CREATE ADDRESS ERROR:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to save delivery address",
    });
  }
};

/* =========================================================
   UPDATE ADDRESS
   PATCH /addresses/:id
========================================================= */

export const updateAddress = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const id = req.params.id;

    if (typeof id !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid address ID",
      });
    }

    const {
      label,
      name,
      phone,
      addressLine1,
      addressLine2,
      landmark,
      city,
      state,
      pincode,
      isDefault,
    } = req.body || {};

    if (!name || !phone || !addressLine1 || !city || !state || !pincode) {
      return res.status(400).json({
        success: false,
        message: "Name, phone, address, city, state and pincode are required",
      });
    }

    const cleanPhone = String(phone).replace(/\s/g, "");

    if (!/^[+]?[0-9]{10,15}$/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number",
      });
    }

    const cleanPincode = String(pincode).trim();

    if (!/^\d{6}$/.test(cleanPincode)) {
      return res.status(400).json({
        success: false,
        message: "Pincode must be exactly 6 digits",
      });
    }

    const address = await updateDeliveryAddress(userId, id, {
      label,
      name: String(name),
      phone: cleanPhone,
      addressLine1: String(addressLine1),
      addressLine2,
      landmark,
      city: String(city),
      state: String(state),
      pincode: cleanPincode,
      isDefault: Boolean(isDefault),
    });

    return res.status(200).json({
      success: true,
      message: "Delivery address updated successfully",
      data: {
        address,
      },
    });
  } catch (error) {
    console.log("UPDATE ADDRESS ERROR:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to update delivery address",
    });
  }
};

/* =========================================================
   DELETE ADDRESS
   DELETE /addresses/:id
========================================================= */

export const removeAddress = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const id = req.params.id;

    if (typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid address ID',
      });
    }
    
    const result =
      await deleteDeliveryAddress(
        userId,
        id,
      );

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to delete delivery address",
    });
  }
};

/* =========================================================
   SET DEFAULT
   PATCH /addresses/:id/default
========================================================= */

export const makeDefaultAddress = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const id = req.params.id;

    if (typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid address ID',
      });
    }
    
    const result =
      await setDefaultDeliveryAddress(
        userId,
        id,
      );

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to set default address",
    });
  }
};
