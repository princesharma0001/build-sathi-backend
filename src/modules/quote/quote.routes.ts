import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";
import {
  acceptBuyerQuoteController,
  createQuoteController,
  getBuyerQuoteByIdController,
  getBuyerQuotesController,
  getSellerQuoteByIdController,
  getSellerQuotesController,
} from "./quote.controller";

const router = Router();

router.post("/", authMiddleware, createQuoteController);
router.get("/seller", authMiddleware, getSellerQuotesController);
router.get("/buyer", authMiddleware, getBuyerQuotesController);
router.patch("/buyer/:id/accept", authMiddleware, acceptBuyerQuoteController);
router.get("/buyer/:id", authMiddleware, getBuyerQuoteByIdController);

router.get("/:id", authMiddleware, getSellerQuoteByIdController);

router.post("/", authMiddleware, requireRole("SELLER"), createQuoteController);
router.get("/seller", authMiddleware, requireRole("SELLER"), getSellerQuotesController);

router.get(
  "/:id",
  authMiddleware,
  requireRole("SELLER"),
  getSellerQuoteByIdController,
);

export default router;
