import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken"
import env from "../env";

const decryptToken = async(accessToken: string) => {
  try {
    return await jwt.verify(accessToken, env.BACKEND_AUTH_PRIVATE_KEY)
  } catch (_) {
    return null
  }
}

export async function authenticateToken(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void>  {
    const authHeader = req.headers['authorization'];
    const accessToken = authHeader && authHeader.split(' ')[1];

    if (!accessToken) {
      res.status(401).json({ message: "Unauthorized" });
      return
    }

    const decodedUser = await decryptToken(accessToken);

    console.log({here: decodedUser})
    
    console.log({accessToken: accessToken, Cookies: req.cookies})
    

    // verify the 2 token
    // check the refresh token if its revoked or not
    // check the access token if they have role and permission to continue

    // why RABC in access token?
    // less roundtrip in db
    // role and permission table doesn't change that much

    // check the agent and ip if the same
  
    next();
}
  
  