// The newest version of the salesperson's phone app. Phones running an older build show a daily, non-blocking
// "ask the admin for the new app" warning. Change these two numbers (and nothing else) when a new APK is given out;
// APP_LATEST_BUILD / APP_LATEST_VERSION in the environment override them without a code change.
module.exports = {
  version: process.env.APP_LATEST_VERSION || "1.0.42",
  build: Number(process.env.APP_LATEST_BUILD) || 43,
};
