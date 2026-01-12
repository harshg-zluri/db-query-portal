import { JWTPayload } from './index';

declare global {
    namespace Express {
        // Extend Passport's User interface
        interface User extends JWTPayload { }

        interface Request {
            user?: User;
            file?: Express.Multer.File;
        }
    }
}

export { };
