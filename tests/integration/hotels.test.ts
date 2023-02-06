import app, { init } from "../../src/app";
import httpStatus from "http-status";
import { prisma } from "../../src/config";
import supertest from "supertest";
import faker from "@faker-js/faker";
import {
  createEnrollmentWithAddress,
  createUser,
  createTicketType,
  createTicket,
  createPayment,
  generateCreditCardData,
} from "../factories";
import * as jwt from "jsonwebtoken";
import { cleanDb, generateValidToken } from "../helpers";
import { TicketStatus } from "@prisma/client";

beforeAll(async () => {
  await init();
  await cleanDb();
});

afterEach(async () => {
  await cleanDb();
});

const server = supertest(app);

describe("GET /hotel when token is invalid", () => {
  it("should respond with status 401 if no token is given", async () => {
    const response = await server.get("/hotels");
  
    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });
  
  it("should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();

    const response = await server.get("/hotels").set("Authorization", `Bearer ${token}`);
  
    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, "top_secret");
    
    const response = await server.get("/hotels").set("Authorization", `Bearer ${token}`);
    
    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });
});

describe("when token is valid and there is no enrollment for the user", () => {
  it("should respond with 404 if there is no enrollment", async () => {
    const token = await generateValidToken();

    const response = await server.get("/hotels").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.NOT_FOUND);
  });
});

describe("when token and enrollment are valid but there is no ticket", () => {
  it("should respond with 404 if there is no ticket", async () => {
    const token = await generateValidToken();
    prisma.user.create({
      data: {
        email: "teste@email.com",
        password: "12345678"
      }
    });

    prisma.enrollment.create({
      data: {
        name: "Adrian",
        cpf: "04805239166",
        birthday: "2023-02-05T19:26:47.729Z",
        phone: "67992214009",
        userId: 1,
      }
    });

    const response = await server.get("/hotels").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.NOT_FOUND);
  });
});

describe("when token, enrollment, ticket are valid but ticket tipe is REMOTE", () => {
  it("should respond with 402 if ticket type is without hotel", async () => {
    const token = await generateValidToken();
    prisma.user.create({
      data: {
        email: "teste@email.com",
        password: "12345678",
        createdAt: "2023-02-05T19:22:43.420Z",
        updatedAt: "2023-02-05T19:22:43.420Z",
      }
    });

    prisma.enrollment.create({
      data: {
        name: "Adrian",
        cpf: "04805239166",
        birthday: "2023-02-05T19:26:47.729Z",
        phone: "67992214009",
        userId: 1,
        createdAt: "2023-02-05T19:22:43.420Z",
        updatedAt: "2023-02-05T19:22:43.420Z",
      }
    });

    prisma.ticketType.create({
      data: {
        name: "tipo teste",
        price: 20,
        isRemote: true,
        includesHotel: false,
        createdAt: "2023-02-05T19:22:43.420Z",
        updatedAt: "2023-02-05T19:22:43.420Z",
      }
    });

    prisma.ticket.create({
      data: {
        ticketTypeId: 1,
        enrollmentId: 1,
        status: "PAID",
        createdAt: "2023-02-05T19:22:43.420Z",
        updatedAt: "2023-02-05T19:22:43.420Z",
      }
    });

    prisma.payment.create({
      data: {
        ticketId: 1,
        value: 20,
        cardIssuer: "teste",
        cardLastDigits: "1234",
        createdAt: "2023-02-05T19:22:43.420Z",
        updatedAt: "2023-02-05T19:22:43.420Z",
      }
    });

    const response = await server.get("/hotels").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.PAYMENT_REQUIRED);
  });
});

describe("when token, enrollment, ticket are valid and ticket type does not include hotel", () => {
  it("should respond with 402 if ticket type does not include hotel ", async () => {
    const token = await generateValidToken();
    prisma.user.create({
      data: {
        email: "teste@email.com",
        password: "12345678"
      }
    });

    prisma.enrollment.create({
      data: {
        name: "Adrian",
        cpf: "04805239166",
        birthday: "2023-02-05T19:26:47.729Z",
        phone: "67992214009",
        userId: 1,
      }
    });

    prisma.ticketType.create({
      data: {
        name: "tipo teste",
        price: 20,
        isRemote: false,
        includesHotel: false,
      }
    });

    prisma.ticket.create({
      data: {
        ticketTypeId: 1,
        enrollmentId: 1,
        status: "PAID",
      }
    });

    prisma.payment.create({
      data: {
        ticketId: 1,
        value: 20,
        cardIssuer: "teste",
        cardLastDigits: "1234",
      }
    });

    const response = await server.get("/hotels").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.PAYMENT_REQUIRED);
  });
});

describe("when token is not paid", () => {
  it("should respond with 402 if ticket not paid", async () => {
    const user = await createUser();
    const token = await generateValidToken(user);
    const enrollment = await createEnrollmentWithAddress(user);
    const ticketType = await createTicketType();
    const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.RESERVED);

    const response = await server.get("/hotels").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.PAYMENT_REQUIRED);
  });
});

describe("when there is no hotel", () => {
  it("should respond with 404 if  there is no hotel with the id given", async () => {  
    const user = await createUser();
    const token = await generateValidToken(user);
    const enrollment = await createEnrollmentWithAddress(user);
    const ticketType = await createTicketType();
    const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.RESERVED);
    const payment = await createPayment(ticket.id, ticketType.price);

    const response = await server.get("/hotels/1").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.PAYMENT_REQUIRED);
  });
});

describe("when its ok", () => {
  it("should respond with 200 and array of hotels", async () => {
    const user = await createUser();
    const token = await generateValidToken(user);
    const enrollment = await createEnrollmentWithAddress(user);
    const ticketType = await createTicketType();
    const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
    const payment = await createPayment(ticket.id, ticketType.price);

    prisma.hotel.create({
      data: {
        name: "Budapeste",
        image: "teste",
      }
    });

    const response = await server.get("/hotels").set("Authorization", `Bearer ${token}`);  

    expect(response.status).toEqual(httpStatus.OK);
    expect(response.body).toEqual([{
      id: expect.any(Number),
      name: expect.any(String),
      image: expect.any(String),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    }]);
  });
});
