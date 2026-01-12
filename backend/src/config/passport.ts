import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { config } from './environment';
import { UserRole } from '../types';
import { AuthService } from '../services/auth.service';

if (config.google.clientId && config.google.clientSecret) {
    passport.use(new GoogleStrategy({
        clientID: config.google.clientId,
        clientSecret: config.google.clientSecret,
        callbackURL: config.google.callbackUrl
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails?.[0]?.value;
            const googleId = profile.id;
            const name = profile.displayName || email?.split('@')[0] || 'Unknown';

            if (!email) {
                return done(new Error('No email found in Google profile'));
            }

            // Use AuthService to handle logic
            const { user, tokens } = await AuthService.loginOrSignupWithGoogle(
                email,
                googleId,
                name
            );

            // Pass tokens to controller via user object or separate arg? 
            // Passport usually expects a user object. We can attach tokens to it.
            return done(null, { ...user, tokens } as any);
        } catch (error) {
            return done(error as Error);
        }
    }));
}

export default passport;
