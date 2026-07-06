const SHEET_EMAILS = "Emails";
const SHEET_USERS = "Users";
const SHEET_LOGS = "Logs";

function doPost(e) {

  try {

    let body;

    // ===== 解析请求 =====
    try {

      body = JSON.parse(
        (e.postData && e.postData.contents) || "{}"
      );

    } catch (e) {

      return jsonOutput({
        success: false,
        message: "请求数据格式错误"
      });

    }

    // ===== API Key 校验 =====
    if (!checkApiKey(body)) {

      return jsonOutput({
        success: false,
        message: "服务不可用"
      });

    }

    const action = String(body.action || "");

    switch (action) {

      // ===== 不加锁（只读） =====

      case "login":
        return jsonOutput(login(body));

      case "search":
        return jsonOutput(searchEmail(body));

      case "stats":
        return jsonOutput(getStats(body));

      case "refresh_otp":
        return jsonOutput(refreshOtp(body));

      // ===== 加锁（写操作） =====

      case "assign":
        return withLock(() => assignEmail(body));

      case "upload":
        return withLock(() => uploadEmail(body));

      case "recycle":
        return withLock(() => recycleEmail(body));

      case "create_user":
        return withLock(() => createUser(body));

      case "logout":
        return withLock(() => logout(body));

      default:

        return jsonOutput({
          success: false,
          message: "无效操作"
        });

    }

  } catch (err) {

    return jsonOutput({
      success: false,
      message: err.toString()
    });

  }

}

function withLock(callback) {
  const lock = LockService.getScriptLock();
  let locked = false;

  try {
    lock.waitLock(30000);
    locked = true;
    return jsonOutput(callback());
  } finally {
    if (locked) lock.releaseLock();
  }
}

function jsonOutput(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function logout(data) {
  const ok = deleteSession(data.token);
  return { success: ok };
}