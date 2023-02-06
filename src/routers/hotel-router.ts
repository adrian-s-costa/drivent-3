import { Router } from "express";
import { authenticateToken } from "../middlewares";
import { getHotelById, getHotels } from "@/controllers";

const hotelRouter = Router();

hotelRouter
  .all("/*", authenticateToken)
  .get("/", getHotels)
  .get("/:hotelId", getHotelById);

export { hotelRouter };

