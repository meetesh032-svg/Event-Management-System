import jwt from "jsonwebtoken";

export type TokenPayload = {
  userId: number;
  email: string;
  role: "attendee" | "organizer" | "admin";
};

const secret = process.env.JWT_SECRET ?? "";

export function signToken(payload: TokenPayload) {
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, secret) as TokenPayload;
  } catch {
    return null;
  }
}
