import { AuthenticatedRequest } from "../middlewares";
import hotelService from "../services/hotels-service";
import { Response } from "express";
import httpStatus from "http-status";

export async function getHotels(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId } = req;
    const hotels = await hotelService.getHotels(userId);
    return res.send(hotels).sendStatus(200);
  } catch (error) {
    if (error.name === "UnauthorizedError") {
      return res.sendStatus(httpStatus.UNAUTHORIZED);
    }else if (error.name === "NotFoundError") {
      return res.sendStatus(httpStatus.NOT_FOUND);
    }else if (error.name === "PaymentError") {
      return res.sendStatus(httpStatus.PAYMENT_REQUIRED);
    }
  }
}

export async function getHotelById(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId } = req;
    const hotelId = parseInt(req.params.hotelId);
    const hotelWRooms = await hotelService.getHotelById(userId, hotelId);
  
    return res.send(hotelWRooms).sendStatus(200);
  } catch (error) {
    if (error.name === "UnauthorizedError") {
      return res.sendStatus(httpStatus.UNAUTHORIZED);
    }
    return res.sendStatus(httpStatus.NOT_FOUND);
  }
}
