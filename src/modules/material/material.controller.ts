import { Request, Response } from "express";

import {
  createCategory,
  createMaterial,
  deleteMaterial,
  getActiveMaterials,
  getAdminMaterials,
  getCategories,
  getMaterialById,
  toggleMaterialStatus,
  updateCategory,
  updateMaterial,
} from "./material.service";

// ==========================================
// CATEGORY
// ==========================================

export const addCategory = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body || {};

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const category = await createCategory({
      name: name.trim(),
      description: description?.trim(),
    });

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: {
        category,
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Unable to create category",
    });
  }
};

export const listCategories = async (req: Request, res: Response) => {
  try {
    const includeInactive = req.query.includeInactive === "true";

    const categories = await getCategories(includeInactive);

    return res.status(200).json({
      success: true,
      data: {
        categories,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to get categories",
    });
  }
};

export const editCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body || {};

    if (typeof id !== "string" || !id.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category ID is required",
      });
    }

    const category = await updateCategory(id, {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(description !== undefined
        ? { description: description?.trim() }
        : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    });

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: {
        category,
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Unable to update category",
    });
  }
};

// ==========================================
// ADMIN MATERIAL
// ==========================================

export const addMaterial = async (req: Request, res: Response) => {
  try {
    const { categoryId, name, description, unit, imageUrl } = req.body || {};

    if (!categoryId || !name || !unit) {
      return res.status(400).json({
        success: false,
        message: "Category, material name and unit are required",
      });
    }

    const material = await createMaterial({
      categoryId,
      name: name.trim(),
      description: description?.trim(),
      unit: unit.trim(),
      imageUrl: imageUrl?.trim(),
    });

    return res.status(201).json({
      success: true,
      message: "Material created successfully",
      data: {
        material,
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Unable to create material",
    });
  }
};

export const listAdminMaterials = async (req: Request, res: Response) => {
  try {
    const materials = await getAdminMaterials();

    return res.status(200).json({
      success: true,
      data: {
        materials,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to get materials",
    });
  }
};

// ==========================================
// BUYER MATERIAL
// ==========================================

export const listBuyerMaterials = async (req: Request, res: Response) => {
  try {
    const categoryId =
      typeof req.query.categoryId === "string"
        ? req.query.categoryId
        : undefined;

    const materials = await getActiveMaterials(categoryId);

    return res.status(200).json({
      success: true,
      data: {
        materials,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to get materials",
    });
  }
};

export const getMaterial = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (typeof id !== "string" || !id.trim()) {
      return res.status(400).json({
        success: false,
        message: "Material ID is required",
      });
    }

    const material = await getMaterialById(id);

    return res.status(200).json({
      success: true,
      data: {
        material,
      },
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error instanceof Error ? error.message : "Material not found",
    });
  }
};

// ==========================================
// UPDATE / DELETE
// ==========================================

export const editMaterial = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (typeof id !== "string" || !id.trim()) {
      return res.status(400).json({
        success: false,
        message: "Material ID is required",
      });
    }

    const { categoryId, name, description, unit, imageUrl, isActive } =
      req.body || {};

    const material = await updateMaterial(id, {
      ...(categoryId !== undefined ? { categoryId } : {}),
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(description !== undefined
        ? { description: description?.trim() }
        : {}),
      ...(unit !== undefined ? { unit: unit.trim() } : {}),
      ...(imageUrl !== undefined ? { imageUrl: imageUrl?.trim() } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    });

    return res.status(200).json({
      success: true,
      message: "Material updated successfully",
      data: {
        material,
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Unable to update material",
    });
  }
};

export const removeMaterial = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (typeof id !== "string" || !id.trim()) {
      return res.status(400).json({
        success: false,
        message: "Material ID is required",
      });
    }

    await deleteMaterial(id);

    return res.status(200).json({
      success: true,
      message: "Material disabled successfully",
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Unable to delete material",
    });
  }
};

export const changeMaterialStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (typeof id !== "string" || !id.trim()) {
      return res.status(400).json({
        success: false,
        message: "Material ID is required",
      });
    }

    const material = await toggleMaterialStatus(id);
    return res.status(200).json({
      success: true,
      message: "Material status updated successfully",
      data: {
        material,
      },
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to update material status",
    });
  }
};
