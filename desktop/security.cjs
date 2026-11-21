function isTrustedIpc(event, window, appOrigin, launcherUrl) {
  if (!window || window.isDestroyed() || event.sender !== window.webContents ||
      !event.senderFrame || event.senderFrame !== window.webContents.mainFrame) return false;
  const url = event.senderFrame.url;
  if (url === launcherUrl) return true;
  try { return Boolean(appOrigin) && new URL(url).origin === appOrigin; }
  catch { return false; }
}
module.exports = { isTrustedIpc };
