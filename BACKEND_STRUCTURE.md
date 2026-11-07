# Backend Structure Specification

Set up this backend exactly as described here. This document is self-contained: you do not need any other project for reference.

**Architecture:** a modular monolith in TypeScript using Express and Mongoose. Code is grouped by feature. Every feature has the same set of files, and a request always passes through the same layers.

**How to read this document**

- Create shared files (sections 3 to 6) as written.
- `catalog/product` in section 7 is a **placeholder example**. Use it as the template, but replace it with the real features of this project.
- Follow the rules in section 8 for every feature you add.
- If the project requirements conflict with this document on business logic, follow the requirements. Keep the structure.

---

## 1. Stack

| Concern | Choice |
|---|---|
| Runtime / language | Node.js, TypeScript (`strict`), CommonJS output |
| HTTP | Express 4 |
| Database | MongoDB with Mongoose 8 |
| Validation | Zod 3 |
| Auth | JWT (`jsonwebtoken`), `bcrypt`, role-based middleware |
| Logging | Winston |
| File uploads (optional) | Multer to local temp folder, then any S3-compatible storage |

Pin the major versions below. This code is written for them, and newer majors have breaking changes.

```bash
npm i express@4 mongoose@8 zod@3 jsonwebtoken@9 bcrypt@5 http-status@2 winston@3 cors@2 cookie-parser@1 dotenv@16 multer@2 @aws-sdk/client-s3@3
npm i -D typescript@5 ts-node-dev@2 @types/node @types/express@4 @types/cors @types/cookie-parser @types/jsonwebtoken @types/bcrypt @types/multer eslint@9 @eslint/js@9 typescript-eslint@8 globals eslint-config-prettier prettier
```

Omit `multer`, `@aws-sdk/client-s3`, `@types/multer` and `src/helpers/fileUploadHelpers.ts` if the project has no file uploads.

---

## 2. Folder structure

```text
project-root/
├── src/
│   ├── server.ts                  # Entry point: connects DB, starts listening
│   ├── app.ts                     # Express app: middleware, routes, error handling
│   ├── config/
│   │   └── index.ts               # The only file that reads process.env
│   ├── constants/
│   │   └── paginationConst.ts     # Constants shared across features
│   ├── errors/
│   │   ├── ApiError.ts            # Error class carrying an HTTP status
│   │   ├── handleCastError.ts     # Mongoose CastError -> standard error shape
│   │   ├── handleValidationError.ts # Mongoose ValidationError -> standard shape
│   │   └── handleZodError.ts      # ZodError -> standard shape
│   ├── helpers/                   # Reusable logic with a specific purpose
│   │   ├── fileUploadHelpers.ts
│   │   ├── jwtHelpers.ts
│   │   └── paginationHelper.ts
│   ├── interfaces/                # Types shared across features
│   │   ├── common.ts
│   │   ├── error.ts
│   │   ├── index.d.ts             # Adds req.user to Express Request
│   │   └── paginationType.ts
│   ├── routes/
│   │   └── index.ts               # Central router: mounts every feature router
│   ├── shared/                    # Small generic utilities
│   │   ├── catchAsync.ts
│   │   ├── logger.ts
│   │   ├── pick.ts
│   │   └── sendResponse.ts
│   └── app/
│       ├── enums/
│       │   └── user.ts            # Enums shared across features
│       ├── middlewares/
│       │   ├── globalErrorHandler.ts
│       │   ├── isAuth.middleware.ts
│       │   └── validationRequest.ts
│       └── modules/
│           ├── auth/              # Standalone feature (no model, uses User)
│           │   ├── auth.controller.ts
│           │   ├── auth.interface.ts
│           │   ├── auth.route.ts
│           │   ├── auth.service.ts
│           │   └── auth.validation.ts
│           ├── entity/            # Domain group: people and accounts
│           │   └── users/
│           │       ├── user.controller.ts
│           │       ├── user.interface.ts
│           │       ├── user.model.ts
│           │       ├── user.route.ts
│           │       ├── user.service.ts
│           │       ├── user.utils.ts
│           │       └── user.validation.ts
│           └── catalog/           # Domain group (placeholder)
│               └── product/       # Feature (placeholder)
│                   ├── product.controller.ts
│                   ├── product.interface.ts
│                   ├── product.model.ts
│                   ├── product.route.ts
│                   ├── product.service.ts
│                   ├── product.utils.ts      # Only if needed
│                   └── product.validation.ts
├── uploads/                       # Temp upload folder, keep with .gitkeep
├── .env                           # Never commit
├── .env.example
├── .gitignore
├── .prettierrc.json
├── eslint.config.mjs
├── package.json
└── tsconfig.json
```

### Where things go

| Folder | Put here | Do not put here |
|---|---|---|
| `src/app/modules/` | Business features | Generic utilities |
| `src/app/middlewares/` | Express middleware | Business logic for one feature |
| `src/app/enums/` | Enums used by more than one feature | Enums used by one feature (those go in its `.interface.ts`) |
| `src/helpers/` | Reusable logic with a specific job, such as pagination, JWT, uploads | Feature logic |
| `src/shared/` | Small generic functions with no business meaning | Anything that imports a model |
| `src/interfaces/` | Types used by more than one feature | Feature types |

### Grouping features

- Use two levels: `modules/<domainGroup>/<feature>/`. Group related features by business domain, for example `billing/invoice` and `billing/payment`.
- A feature that fits no group may sit directly under `modules/`, as `auth/` does. Imports then need one less `../`.
- One feature means one primary resource. If a folder starts handling two resources, split it.

---

## 3. Root configuration files

**`package.json` scripts**

```json
{
  "main": "dist/server.js",
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "typecheck": "tsc --noEmit",
    "lint:check": "eslint .",
    "lint:fix": "eslint . --fix",
    "prettier:check": "prettier --check .",
    "prettier:fix": "prettier --write ."
  }
}
```

**`tsconfig.json`**

```json
{
  "include": ["src"],
  "exclude": ["node_modules"],
  "compilerOptions": {
    "target": "es2016",
    "module": "commonjs",
    "rootDir": "./src",
    "outDir": "./dist",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true
  }
}
```

**`.gitignore`**

```text
node_modules
dist
.env
uploads/*
!uploads/.gitkeep
*.log
```

**`.prettierrc.json`**

```json
{
  "semi": true,
  "singleQuote": true
}
```

**`eslint.config.mjs`**

```js
import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default [
  { ignores: ['dist', 'node_modules'] },
  { files: ['**/*.{js,mjs,cjs,ts}'] },
  { languageOptions: { globals: globals.node } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
];
```

**`.env.example`** (commit this file with empty secrets)

```bash
NODE_ENV=development
PORT=5000
DATABASE_URL=
BCRYPT_SALT_ROUNDS=11
JWT_SECRET=
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=
JWT_REFRESH_EXPIRES_IN=30d
CORS_ORIGINS=http://localhost:3000

# Only needed for file uploads
STORAGE_REGION=
STORAGE_ENDPOINT=
STORAGE_BUCKET=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
STORAGE_PUBLIC_URL=
```

---

## 4. Application core

```ts
// src/server.ts
import mongoose from 'mongoose';
import app from './app';
import config from './config';
import { errorLogger, logger } from './shared/logger';

process.on('unhandledRejection', (reason) => {
  errorLogger.error(`Unhandled rejection: ${String(reason)}`);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  errorLogger.error(`Uncaught exception: ${err.stack}`);
  process.exit(1);
});

async function main() {
  try {
    await mongoose.connect(config.database_url);
    logger.info('Database connected');

    app.listen(config.port, () => {
      logger.info(`App listening on port ${config.port}`);
    });
  } catch (err) {
    errorLogger.error(`Failed to connect to database: ${String(err)}`);
    process.exit(1);
  }
}

main();
```

```ts
// src/app.ts
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Application, Request, Response } from 'express';
import httpStatus from 'http-status';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import config from './config';
import routes from './routes';

const app: Application = express();

app.use(cors({ origin: config.cors_origins, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/v1', routes);

app.get('/', (req: Request, res: Response) => {
  res.send('Server is running');
});

// Not-found handler. Must come after all routes.
app.use((req: Request, res: Response) => {
  res.status(httpStatus.NOT_FOUND).json({
    success: false,
    message: 'Route not found',
    errorMessages: [{ path: req.originalUrl, message: 'API not found' }],
  });
});

// Error handler. Must be the last middleware.
app.use(globalErrorHandler);

export default app;
```

```ts
// src/config/index.ts
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

// Fail at startup, not on the first request, if a required value is missing.
const required = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing environment variable: ${key}`);
  return value;
};

export default {
  NODE_ENV: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  database_url: required('DATABASE_URL'),
  bcrypt_salt_rounds: Number(process.env.BCRYPT_SALT_ROUNDS || 11),
  cors_origins: (process.env.CORS_ORIGINS || '').split(',').filter(Boolean),
  jwt: {
    secret: required('JWT_SECRET'),
    expires_in: process.env.JWT_EXPIRES_IN || '1d',
    refresh_secret: required('JWT_REFRESH_SECRET'),
    refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  storage: {
    region: process.env.STORAGE_REGION || '',
    endpoint: process.env.STORAGE_ENDPOINT || '',
    bucket: process.env.STORAGE_BUCKET || '',
    access_key: process.env.STORAGE_ACCESS_KEY || '',
    secret_key: process.env.STORAGE_SECRET_KEY || '',
    public_url: process.env.STORAGE_PUBLIC_URL || '',
  },
};
```

```ts
// src/routes/index.ts
import express from 'express';
import { ProductRoutes } from '../app/modules/catalog/product/product.route';

const router = express.Router();

// Add one entry for every feature router.
const moduleRoutes = [
  {
    path: '/products',
    route: ProductRoutes,
  },
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
```

---

## 5. Shared code

### Errors

```ts
// src/errors/ApiError.ts
class ApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string | undefined, stack = '') {
    super(message);
    this.statusCode = statusCode;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default ApiError;
```

```ts
// src/errors/handleCastError.ts
import mongoose from 'mongoose';
import { IGenericErrorResponse } from '../interfaces/common';

const handleCastError = (
  error: mongoose.Error.CastError,
): IGenericErrorResponse => ({
  statusCode: 400,
  message: 'Cast Error',
  errorMessages: [{ path: error.path, message: 'Invalid Id' }],
});

export default handleCastError;
```

```ts
// src/errors/handleValidationError.ts
import mongoose from 'mongoose';
import { IGenericErrorResponse } from '../interfaces/common';

const handleValidationError = (
  error: mongoose.Error.ValidationError,
): IGenericErrorResponse => ({
  statusCode: 400,
  message: 'Validation Error',
  errorMessages: Object.values(error.errors).map((el) => ({
    path: el.path,
    message: el.message,
  })),
});

export default handleValidationError;
```

```ts
// src/errors/handleZodError.ts
import { ZodError } from 'zod';
import { IGenericErrorResponse } from '../interfaces/common';

const handleZodError = (error: ZodError): IGenericErrorResponse => ({
  statusCode: 400,
  message: 'Validation Error',
  errorMessages: error.issues.map((issue) => ({
    path: issue.path[issue.path.length - 1],
    message: issue.message,
  })),
});

export default handleZodError;
```

### Interfaces and constants

```ts
// src/interfaces/error.ts
export type IGenericErrorMessage = {
  path: string | number;
  message: string;
};
```

```ts
// src/interfaces/common.ts
import { IGenericErrorMessage } from './error';

export type IGenericErrorResponse = {
  statusCode: number;
  message: string;
  errorMessages: IGenericErrorMessage[];
};

export type IGenericPaginationResponse<T> = {
  meta: {
    page: number;
    limit: number;
    total: number;
  };
  data: T;
};
```

```ts
// src/interfaces/paginationType.ts
export type IPaginationOptions = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};
```

```ts
// src/interfaces/index.d.ts
import { Types } from 'mongoose';

declare global {
  namespace Express {
    interface Request {
      user: {
        _id: Types.ObjectId;
        userId: string;
        role: string;
      };
    }
  }
}
```

```ts
// src/constants/paginationConst.ts
export const paginationFields = ['page', 'limit', 'sortBy', 'sortOrder'];
```

### Utilities

```ts
// src/shared/catchAsync.ts
import { NextFunction, Request, RequestHandler, Response } from 'express';

const catchAsync = (fn: RequestHandler) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res, next);
    } catch (err) {
      next(err);
    }
  };
};

export default catchAsync;
```

```ts
// src/shared/sendResponse.ts
import { Response } from 'express';

type IApiResponse<T> = {
  statusCode: number;
  success: boolean;
  message?: string | null;
  meta?: {
    page: number;
    limit: number;
    total: number;
  };
  data: T | null;
};

const sendResponse = <T>(res: Response, data: IApiResponse<T>): void => {
  res.status(data.statusCode).json({
    statusCode: data.statusCode,
    success: data.success,
    message: data.message ?? null,
    meta: data.meta,
    data: data.data ?? null,
  });
};

export default sendResponse;
```

```ts
// src/shared/pick.ts
const pick = <T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Partial<T> => {
  const finalObj: Partial<T> = {};
  for (const key of keys) {
    if (Object.hasOwnProperty.call(obj, key)) {
      finalObj[key] = obj[key];
    }
  }
  return finalObj;
};

export default pick;
```

```ts
// src/shared/logger.ts
import { createLogger, format, transports } from 'winston';

const { combine, timestamp, label, printf } = format;

const logFormat = printf(({ message, label, timestamp }) => {
  return `${timestamp} [${label}] ${message}`;
});

const logger = createLogger({
  level: 'info',
  format: combine(label({ label: 'INFO' }), timestamp(), logFormat),
  transports: [new transports.Console()],
});

const errorLogger = createLogger({
  level: 'error',
  format: combine(label({ label: 'ERROR' }), timestamp(), logFormat),
  transports: [new transports.Console()],
});

export { logger, errorLogger };
```

### Helpers

```ts
// src/helpers/paginationHelper.ts
import { SortOrder } from 'mongoose';

type IOptions = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
};

type IReturn = {
  page: number;
  limit: number;
  skip: number;
  sortBy: string;
  sortOrder: SortOrder;
};

const calculatePagination = (options: IOptions): IReturn => {
  const page = Number(options.page || 1);
  const limit = Number(options.limit || 10);
  const skip = (page - 1) * limit;
  const sortBy = options.sortBy || 'createdAt';
  const sortOrder = options.sortOrder || 'desc';

  return { page, limit, skip, sortBy, sortOrder };
};

export const paginationHelper = {
  calculatePagination,
};
```

```ts
// src/helpers/jwtHelpers.ts
import jwt, { JwtPayload, Secret, SignOptions } from 'jsonwebtoken';

const createToken = (
  payload: object,
  secret: Secret,
  expiresIn: string | number,
) => {
  return jwt.sign(payload, secret, { expiresIn } as SignOptions);
};

const verifyToken = (token: string, secret: Secret): JwtPayload => {
  return jwt.verify(token, secret) as JwtPayload;
};

export const jwtHelpers = {
  createToken,
  verifyToken,
};
```

```ts
// src/helpers/fileUploadHelpers.ts
import {
  DeleteObjectCommand,
  ObjectCannedACL,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import httpStatus from 'http-status';
import multer from 'multer';
import path from 'path';
import config from '../config';
import ApiError from '../errors/ApiError';

const s3 = new S3Client({
  region: config.storage.region,
  endpoint: config.storage.endpoint,
  credentials: {
    accessKeyId: config.storage.access_key,
    secretAccessKey: config.storage.secret_key,
  },
});

const CONTENT_TYPES: Record<string, string> = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
};

const getExtension = (filename: string) =>
  path.extname(filename).toLowerCase();

const upload = multer({
  storage: multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
      cb(null, `${randomUUID()}${getExtension(file.originalname)}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    if (CONTENT_TYPES[getExtension(file.originalname)]) {
      cb(null, true);
    } else {
      cb(new ApiError(httpStatus.BAD_REQUEST, 'Unsupported file type'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Store the returned url and key on the document. The key is needed to delete.
const uploadToStorage = async (file: Express.Multer.File) => {
  const key = `uploads/${file.filename}`;

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: config.storage.bucket,
        Key: key,
        Body: fs.createReadStream(file.path),
        ACL: 'public-read' as ObjectCannedACL,
        ContentType: CONTENT_TYPES[getExtension(file.filename)],
      }),
    );
    return { url: `${config.storage.public_url}/${key}`, key };
  } finally {
    fs.unlink(file.path, () => undefined);
  }
};

const deleteFromStorage = async (key: string) => {
  await s3.send(
    new DeleteObjectCommand({ Bucket: config.storage.bucket, Key: key }),
  );
};

export const FileUploadHelper = {
  upload,
  uploadToStorage,
  deleteFromStorage,
};
```

---

## 6. Middleware, enums and the User model

```ts
// src/app/middlewares/globalErrorHandler.ts
import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import config from '../../config';
import ApiError from '../../errors/ApiError';
import handleCastError from '../../errors/handleCastError';
import handleValidationError from '../../errors/handleValidationError';
import handleZodError from '../../errors/handleZodError';
import { IGenericErrorMessage } from '../../interfaces/error';
import { errorLogger } from '../../shared/logger';

// Express identifies error middleware by its four arguments, so keep `next`.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const globalErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  errorLogger.error(err?.stack || String(err));

  let statusCode = 500;
  let message = 'Something went wrong';
  let errorMessages: IGenericErrorMessage[] = [];

  // Order matters. ApiError and ZodError extend Error, so the generic
  // `instanceof Error` check must stay last or they lose their status code.
  if (err instanceof ZodError) {
    ({ statusCode, message, errorMessages } = handleZodError(err));
  } else if (err?.name === 'ValidationError') {
    ({ statusCode, message, errorMessages } = handleValidationError(err));
  } else if (err?.name === 'CastError') {
    ({ statusCode, message, errorMessages } = handleCastError(err));
  } else if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errorMessages = [{ path: '', message: err.message }];
  } else if (err instanceof Error) {
    message = err.message;
    errorMessages = [{ path: '', message: err.message }];
  }

  res.status(statusCode).json({
    success: false,
    message,
    errorMessages,
    stack: config.NODE_ENV !== 'production' ? err?.stack : undefined,
  });
};

export default globalErrorHandler;
```

```ts
// src/app/middlewares/validationRequest.ts
import { NextFunction, Request, Response } from 'express';
import { AnyZodObject } from 'zod';
import catchAsync from '../../shared/catchAsync';

const validationRequest = (schema: AnyZodObject) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  });
};

export default validationRequest;
```

```ts
// src/app/middlewares/isAuth.middleware.ts
import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import jwt from 'jsonwebtoken';
import config from '../../config';
import ApiError from '../../errors/ApiError';
import { jwtHelpers } from '../../helpers/jwtHelpers';
import { User } from '../modules/entity/users/user.model';

// Usage: isAuth() for any signed-in user, isAuth(USER_ROLE.ADMIN) for a role.
export const isAuth =
  (...requiredRoles: string[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized');
      }

      const payload = jwtHelpers.verifyToken(token, config.jwt.secret);

      const user = await User.findOne({ userId: payload.userId });
      if (!user || user.isBlocked) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized');
      }

      if (requiredRoles.length && !requiredRoles.includes(user.role)) {
        throw new ApiError(httpStatus.FORBIDDEN, 'Access forbidden');
      }

      req.user = { _id: user._id, userId: user.userId, role: user.role };
      next();
    } catch (error) {
      // TokenExpiredError extends JsonWebTokenError, so this covers both.
      if (error instanceof jwt.JsonWebTokenError) {
        return next(
          new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired token'),
        );
      }
      next(error);
    }
  };
```

```ts
// src/app/enums/user.ts
// Adjust the roles to the project. Keep one role enum for the whole app.
export enum USER_ROLE {
  ADMIN = 'admin',
  USER = 'user',
}
```

### User model

`User` is the single login account. If the project has role-specific profiles, give each its own feature under `entity/` and reference it from `User`. Create both documents in one transaction (see section 7).

```ts
// src/app/modules/entity/users/user.interface.ts
import { Model } from 'mongoose';
import { USER_ROLE } from '../../../enums/user';

export interface IUser {
  userId: string;
  name: string;
  password: string;
  role: USER_ROLE;
  needsPasswordChange: boolean;
  isBlocked: boolean;
}

export type UserModel = Model<IUser> & {
  isPasswordMatched(
    givenPassword: string,
    savedPassword: string,
  ): Promise<boolean>;
};
```

```ts
// src/app/modules/entity/users/user.model.ts
import bcrypt from 'bcrypt';
import { Schema, model } from 'mongoose';
import config from '../../../../config';
import { USER_ROLE } from '../../../enums/user';
import { IUser, UserModel } from './user.interface';

const userSchema = new Schema<IUser, UserModel>(
  {
    userId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(USER_ROLE), required: true },
    needsPasswordChange: { type: Boolean, default: true },
    isBlocked: { type: Boolean, default: false },
  },
  { timestamps: true },
);

userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(
      this.password,
      config.bcrypt_salt_rounds,
    );
  }
  next();
});

userSchema.statics.isPasswordMatched = function (
  givenPassword: string,
  savedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(givenPassword, savedPassword);
};

export const User = model<IUser, UserModel>('User', userSchema);
```

### Auth module rules

`modules/auth/` has no model. It works on `User`. Build these endpoints:

| Method and path | Behaviour |
|---|---|
| `POST /auth/login` | Load the user with `.select('+password')`. If `isPasswordMatched` returns `false`, throw 401. Return an access token in the body and set the refresh token in a cookie. |
| `POST /auth/refresh-token` | Read `req.cookies.refreshToken`, verify it with `config.jwt.refresh_secret`, return a new access token. |
| `POST /auth/change-password` | Uses `isAuth()`. Verify the old password, assign the new one, call `user.save()` so the hook hashes it. |
| `POST /auth/log-out` | Uses `isAuth()`. Clear the refresh cookie. |

Rules:

- Sign access tokens with `config.jwt.secret` and refresh tokens with `config.jwt.refresh_secret`. The secrets must differ.
- Set the refresh cookie with `httpOnly: true`, and `secure: true` in production.
- Never return a password, even a hashed one, from any endpoint.
- Never use a shared default password. Generate a temporary one per user, or use an invite flow.
- `insertMany` and `findOneAndUpdate` skip the `save` hook. Do not write passwords through them.

---

## 7. Feature template

Every feature follows this request flow:

```text
Request
  -> feature.route.ts       path, isAuth, upload, validationRequest
  -> feature.controller.ts  reads req, calls service, calls sendResponse
  -> feature.service.ts     business logic and database queries
  -> feature.model.ts       Mongoose schema
Response (sendResponse), or any thrown error -> globalErrorHandler
```

| File | Responsibility | Must not |
|---|---|---|
| `.route.ts` | Declare endpoints and their middleware | Contain logic |
| `.controller.ts` | Extract request data, call the service, send the response | Query the database or hold business rules |
| `.service.ts` | Business logic, database access, throw `ApiError` | Touch `req` or `res` |
| `.model.ts` | Schema, indexes, hooks, statics | Contain business workflows |
| `.interface.ts` | TypeScript types for this feature | Contain runtime logic |
| `.validation.ts` | Zod schemas for request input | Query the database |
| `.utils.ts` | Private helpers, such as ID generators. Create only if needed. | Be imported by unrelated features |

The example below is the complete template.

```ts
// src/app/modules/catalog/product/product.interface.ts
import { Model, Types } from 'mongoose';

export interface IProduct {
  title: string;
  price: number;
  status: 'active' | 'archived';
  createdBy: Types.ObjectId;
}

export type ProductModel = Model<IProduct>;

export type IProductFilters = {
  searchTerm?: string;
  status?: string;
};
```

```ts
// src/app/modules/catalog/product/product.model.ts
import { Schema, model } from 'mongoose';
import { IProduct, ProductModel } from './product.interface';

const productSchema = new Schema<IProduct, ProductModel>(
  {
    title: { type: String, required: true },
    price: { type: Number, required: true },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

export const Product = model<IProduct, ProductModel>('Product', productSchema);
```

```ts
// src/app/modules/catalog/product/product.validation.ts
import { z } from 'zod';

const createProductSchema = z.object({
  body: z.object({
    title: z.string({ required_error: 'Title is required' }),
    price: z.number({ required_error: 'Price is required' }).positive(),
  }),
});

const updateProductSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    price: z.number().positive().optional(),
    status: z.enum(['active', 'archived']).optional(),
  }),
});

export const ProductValidation = {
  createProductSchema,
  updateProductSchema,
};
```

```ts
// src/app/modules/catalog/product/product.route.ts
import express from 'express';
import { USER_ROLE } from '../../../enums/user';
import { isAuth } from '../../../middlewares/isAuth.middleware';
import validationRequest from '../../../middlewares/validationRequest';
import { ProductController } from './product.controller';
import { ProductValidation } from './product.validation';

const router = express.Router();

router.post(
  '/',
  isAuth(USER_ROLE.ADMIN),
  validationRequest(ProductValidation.createProductSchema),
  ProductController.createProduct,
);
router.get('/', ProductController.getAllProducts);
router.get('/:id', ProductController.getProductById);
router.patch(
  '/:id',
  isAuth(USER_ROLE.ADMIN),
  validationRequest(ProductValidation.updateProductSchema),
  ProductController.updateProduct,
);
router.delete(
  '/:id',
  isAuth(USER_ROLE.ADMIN),
  ProductController.deleteProduct,
);

export const ProductRoutes = router;
```

```ts
// src/app/modules/catalog/product/product.controller.ts
import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { paginationFields } from '../../../../constants/paginationConst';
import catchAsync from '../../../../shared/catchAsync';
import pick from '../../../../shared/pick';
import sendResponse from '../../../../shared/sendResponse';
import { ProductService } from './product.service';

const createProduct = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductService.createProduct({
    ...req.body,
    createdBy: req.user._id,
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Product created successfully',
    data: result,
  });
});

const getAllProducts = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, ['searchTerm', 'status']);
  const paginationOptions = pick(req.query, paginationFields);

  const result = await ProductService.getAllProducts(
    filters,
    paginationOptions,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Products retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getProductById = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductService.getProductById(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Product retrieved successfully',
    data: result,
  });
});

const updateProduct = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductService.updateProduct(req.params.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Product updated successfully',
    data: result,
  });
});

const deleteProduct = catchAsync(async (req: Request, res: Response) => {
  await ProductService.deleteProduct(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Product deleted successfully',
    data: null,
  });
});

export const ProductController = {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
```

```ts
// src/app/modules/catalog/product/product.service.ts
import httpStatus from 'http-status';
import { FilterQuery, SortOrder } from 'mongoose';
import ApiError from '../../../../errors/ApiError';
import { paginationHelper } from '../../../../helpers/paginationHelper';
import { IGenericPaginationResponse } from '../../../../interfaces/common';
import { IPaginationOptions } from '../../../../interfaces/paginationType';
import { IProduct, IProductFilters } from './product.interface';
import { Product } from './product.model';

const productSearchableFields = ['title'];

const createProduct = async (payload: IProduct) => {
  return Product.create(payload);
};

const getAllProducts = async (
  filters: IProductFilters,
  paginationOptions: IPaginationOptions,
): Promise<IGenericPaginationResponse<IProduct[]>> => {
  const { searchTerm, ...filterData } = filters;
  const andConditions: FilterQuery<IProduct>[] = [];

  // Search: partial match across the searchable fields
  if (searchTerm) {
    andConditions.push({
      $or: productSearchableFields.map((field) => ({
        [field]: { $regex: searchTerm, $options: 'i' },
      })),
    });
  }

  // Filter: exact match on each remaining field
  if (Object.keys(filterData).length) {
    andConditions.push({
      $and: Object.entries(filterData).map(([field, value]) => ({
        [field]: value,
      })),
    });
  }

  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(paginationOptions);

  const sortConditions: { [key: string]: SortOrder } = { [sortBy]: sortOrder };
  const where = andConditions.length ? { $and: andConditions } : {};

  const data = await Product.find(where)
    .sort(sortConditions)
    .skip(skip)
    .limit(limit);
  const total = await Product.countDocuments(where);

  return { meta: { page, limit, total }, data };
};

const getProductById = async (id: string) => {
  const product = await Product.findById(id);
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }
  return product;
};

const updateProduct = async (id: string, payload: Partial<IProduct>) => {
  const product = await Product.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }
  return product;
};

const deleteProduct = async (id: string) => {
  const product = await Product.findByIdAndDelete(id);
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }
  return product;
};

export const ProductService = {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
```

### Multi-document writes

When one operation writes to several documents, use a transaction in the service. Pass `{ session }` to every write, and pass the array form to `create`. Transactions require MongoDB to run as a replica set, which Atlas does by default. For a local database, start `mongod` with a replica set.

```ts
const session = await mongoose.startSession();
try {
  session.startTransaction();

  const [profile] = await Profile.create([profileData], { session });
  const [user] = await User.create([{ ...userData, profile: profile._id }], {
    session,
  });

  await session.commitTransaction();
  return user;
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  await session.endSession();
}
```

### File uploads

1. In the route, place upload middleware after `isAuth` and before `validationRequest`. An unauthenticated caller must not be able to write files.
2. In the controller, call `FileUploadHelper.uploadToStorage(file)`, then pass the returned `url` and `key` to the service.
3. Save both `url` and `key` on the document.
4. Multipart bodies arrive as strings. Numbers and JSON fields need `JSON.parse` or `z.coerce` before they pass validation.

```ts
router.post(
  '/',
  isAuth(USER_ROLE.ADMIN),
  FileUploadHelper.upload.fields([{ name: 'image', maxCount: 1 }]),
  validationRequest(ProductValidation.createProductSchema),
  ProductController.createProduct,
);
```

---

## 8. Conventions

### Naming

Apply these exactly. Do not introduce variants such as `.validator.ts`, `.router.ts` or `.util.ts`.

| Item | Convention | Example |
|---|---|---|
| Feature folder | camelCase, singular | `purchaseOrder/` |
| Feature file | `<feature>.<layer>.ts` | `purchaseOrder.service.ts` |
| Domain group folder | camelCase | `catalog/` |
| URL path | kebab-case, plural | `/purchase-orders` |
| Service object | `<Feature>Service` | `PurchaseOrderService` |
| Controller object | `<Feature>Controller` | `PurchaseOrderController` |
| Router export | `<Feature>Routes` | `PurchaseOrderRoutes` |
| Validation object | `<Feature>Validation` | `PurchaseOrderValidation` |
| Mongoose model | PascalCase, singular | `PurchaseOrder` |
| Document type | `I<Feature>` | `IPurchaseOrder` |
| Model type | `<Feature>Model` | `PurchaseOrderModel` |
| Filter type | `I<Feature>Filters` | `IPurchaseOrderFilters` |
| Enum | `UPPER_SNAKE_CASE` | `USER_ROLE` |

### Exports and imports

- Use named exports for everything in a feature. Default exports are only for `shared/`, `errors/`, `app.ts`, `routes/index.ts`, `config/index.ts`, `globalErrorHandler` and `validationRequest`.
- Collect functions into one object at the bottom of the file, as `ProductController` and `ProductService` do.
- Use relative imports, with no path aliases. From `modules/<group>/<feature>/`:
  - `../../../../shared/...`, `errors/`, `helpers/`, `interfaces/`, `constants/`, `config`
  - `../../../middlewares/...`, `../../../enums/...`
- A service may import another feature's model or service. A feature must never import another feature's controller or route.

### API contract

Base path is `/api/v1`. Successful responses always have this shape, sent through `sendResponse`:

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Products retrieved successfully",
  "meta": { "page": 1, "limit": 10, "total": 42 },
  "data": []
}
```

`meta` appears only on paginated lists. Error responses always come from `globalErrorHandler`:

```json
{
  "success": false,
  "message": "Validation Error",
  "errorMessages": [{ "path": "title", "message": "Title is required" }]
}
```

List endpoints accept `page`, `limit`, `sortBy`, `sortOrder`, `searchTerm` and any filter field the controller allows through `pick`.

### Rules

1. Every controller uses `catchAsync`. Do not write `try/catch` in controllers.
2. Every route that accepts a body uses `validationRequest`.
3. Every route uses `isAuth` unless it is deliberately public. Check this for each endpoint, including `DELETE`.
4. Business failures throw `ApiError` with a status code. Do not call `res.status(...)` outside `sendResponse`, `app.ts` and `globalErrorHandler`.
5. Declare static paths before dynamic ones. `/summary` goes above `/:id`, or `/:id` will match it.
6. `process.env` is read only in `src/config/index.ts`. Secrets never appear in source code.
7. Use `logger` and `errorLogger`, not `console.log`.
8. Every schema uses `{ timestamps: true }`.
9. Do not commit commented-out code.
10. Only allow-listed fields reach a query, using `pick`. Do not pass `req.query` straight to Mongoose.

---

## 9. Adding a new feature

1. Create `src/app/modules/<group>/<feature>/`.
2. Add the types to `<feature>.interface.ts`.
3. Add the schema to `<feature>.model.ts`.
4. Add the Zod schemas to `<feature>.validation.ts`.
5. Add the logic to `<feature>.service.ts`.
6. Add handlers to `<feature>.controller.ts`.
7. Add endpoints to `<feature>.route.ts`, with `isAuth` and `validationRequest`.
8. Register the router in the `moduleRoutes` array in `src/routes/index.ts`.
9. Run `npm run typecheck` and `npm run lint:check`.

---

## 10. Definition of done for the initial setup

- [ ] Folder structure matches section 2, with real features replacing `catalog/product`.
- [ ] `npm run build` succeeds, and `npm start` runs from `dist/server.js`.
- [ ] Starting without `DATABASE_URL` fails immediately with a clear error.
- [ ] An unknown route returns 404 in the standard error shape.
- [ ] An invalid request body returns 400 with `errorMessages`.
- [ ] An `ApiError(404)` thrown in a service returns 404, not 500.
- [ ] A protected route returns 401 without a token and 403 with the wrong role.
- [ ] Login succeeds with the correct password and fails with a wrong one.
- [ ] `.env`, `dist` and `uploads` contents are ignored by git, and no secret is in source code.
