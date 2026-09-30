import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
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

export default router;
