import { JWTPayload } from './index';

declare global {
    namespace Express {
        interface Request {
            user?: JWTPayload;
            file?: Express.Multer.File;
        }
    }
}

export { };
