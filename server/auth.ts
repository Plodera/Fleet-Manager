import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, RequestHandler } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  // Handle plaintext passwords (legacy/test accounts without hash)
  if (!stored.includes(".")) {
    return supplied === stored;
  }
  const [hashed, salt] = stored.split(".");
  if (!salt) {
    return supplied === stored;
  }
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Middleware to validate single session per user
export const validateSession: RequestHandler = async (req, res, next) => {
  if (req.isAuthenticated() && req.user && req.sessionID) {
    const user = req.user as SelectUser;
    // Fetch the latest user data to check current session
    const dbUser = await storage.getUser(user.id);
    if (dbUser && dbUser.currentSessionId && dbUser.currentSessionId !== req.sessionID) {
      // Session was invalidated by another login
      req.logout((err) => {
        if (err) console.error("Logout error:", err);
        return res.status(440).json({ 
          message: "Session expired",
          reason: "logged_in_elsewhere",
          notification: "Your session has been terminated because your account was logged in from another location."
        });
      });
      return;
    }
  }
  next();
};

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "r3pl1t",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, (user as SelectUser).id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      const hashedPassword = await hashPassword(req.body.password);
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
      });

      req.login(user, async (err) => {
        if (err) return next(err);
        // Save session ID for single session enforcement
        await storage.updateUserSession(user.id, req.sessionID);
        res.status(201).json(user);
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/login", passport.authenticate("local"), async (req, res) => {
    const user = req.user as SelectUser;
    // Save session ID for single session enforcement
    await storage.updateUserSession(user.id, req.sessionID);
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    const user = req.user as SelectUser | undefined;
    req.logout(async (err) => {
      if (err) return next(err);
      // Clear session ID on logout
      if (user) {
        await storage.updateUserSession(user.id, null);
      }
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}
