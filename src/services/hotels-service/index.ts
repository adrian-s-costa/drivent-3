import { notFoundError, paymentError } from "@/errors";
import ticketService from "../tickets-service";
import paymentService from "../payments-service";
import hotelRepository from "@/repositories/hotel-repository";
import { Ticket, TicketType } from "@prisma/client";

async function verifyPayment(userId: number, ticket: Ticket) {
  const payment = await paymentService.getPaymentByTicketId(userId, ticket.id);

  if(!payment) {
    throw paymentError();
  }
    
  const getTicketTypes = await ticketService.getTicketTypes();

  function filterTicket(item: TicketType) {
    if((!item.isRemote && item.includesHotel) && (item.id == ticket.ticketTypeId)) {
      return true;
    }
    return false;
  }

  const ticketType = getTicketTypes.filter(filterTicket);
    
  return ticketType[0];
}

async function getHotels(userId: number) {
  try{
    const ticket = await ticketService.getTicketByUserId(userId);
    if(!ticket) {
      throw notFoundError();
    }

    const ticketType = await verifyPayment(userId, ticket);
    
    if(!ticketType) {
      throw notFoundError();
    }

    const hotels = await hotelRepository.findHotels();

    return hotels;
  }catch{
    throw notFoundError();
  }
}

async function getHotelById(userId: number, hotelId: number) {
  try{
    const ticket = await ticketService.getTicketByUserId(userId);
    if(!ticket) {
      throw notFoundError();
    }

    const ticketType = await verifyPayment(userId, ticket);
        
    if(!ticketType) {
      throw notFoundError();
    }

    if(ticketType.isRemote || !ticketType.includesHotel) {
      throw paymentError();
    }
    
    const hotels = await hotelRepository.findHotelById(hotelId);

    if(!hotels) {
      throw notFoundError();
    }

    return hotels;
  }catch{
    throw notFoundError();
  }}

export default{
  getHotels,
  getHotelById
};
