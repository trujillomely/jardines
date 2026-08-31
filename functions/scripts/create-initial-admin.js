const {initializeApp, getApps} = require("firebase-admin/app");
const {getAuth} = require("firebase-admin/auth");

if (getApps().length === 0) initializeApp();

const email = process.env.INITIAL_ADMIN_EMAIL;
const password = process.env.INITIAL_ADMIN_PASSWORD;
if (!email || !password) {
  throw new Error(
      "INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD are required.");
}

const auth = getAuth();
const run = async () => {
  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch (error) {
    if (error.code !== "auth/user-not-found") throw error;
    user = await auth.createUser({email, password, emailVerified: true});
  }
  await auth.setCustomUserClaims(user.uid, {role: "admin"});
  console.log(`Initial admin configured: ${user.uid}`);
};

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
