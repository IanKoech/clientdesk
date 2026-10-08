import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { db } from "./db";
import { sendEmail } from "./email";
export const auth = betterAuth({
  appName: "ClientDesk",
  database: db,
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) =>
      sendEmail(
        user.email,
        "Reset your ClientDesk password",
        `Reset your password: ${url}`,
      ),
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 3600,
    sendVerificationEmail: async ({ user, url }) =>
      sendEmail(
        user.email,
        "Verify your ClientDesk email",
        `Verify your email: ${url}`,
      ),
  },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  rateLimit: { enabled: true, storage: "database", window: 60, max: 30 },
  plugins: [
    organization({
      invitationExpiresIn: 60 * 60 * 24 * 2,
      requireEmailVerificationOnInvitation: true,
      sendInvitationEmail: async (data) => {
        await sendEmail(
          data.email,
          `Join ${data.organization.name} on ClientDesk`,
          `${data.inviter.user.name} invited you. Accept within 48 hours: ${process.env.BETTER_AUTH_URL}/invite/${data.id}`,
        );
      },
    }),
  ],
});
