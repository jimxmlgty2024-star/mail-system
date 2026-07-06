// ========================================
// Security.gs
// V3.3 Security Module
// ========================================


// ---------- API Key ----------

// 第一次使用请执行 initSecurity()
// API Key 将保存到 Script Properties
const SECURITY_API_KEY_NAME = "API_KEY";


// ---------- Login Limit ----------

// 最大连续登录失败次数
const LOGIN_MAX_FAIL = 5;

// 锁定时间（分钟）
const LOGIN_LOCK_MINUTES = 10;


// ---------- Cache Prefix ----------

const CACHE_LOGIN_FAIL_PREFIX = "LOGIN_FAIL_";
const CACHE_LOGIN_LOCK_PREFIX = "LOGIN_LOCK_";


// ---------- Security Action ----------

const SECURITY_ACTION = "security";


// ========================================
// 初始化 API Key（仅执行一次）
// ========================================

function initSecurity() {

  const props = PropertiesService.getScriptProperties();

  if (props.getProperty(SECURITY_API_KEY_NAME)) {
    Logger.log("API Key 已存在");
    return;
  }

  const apiKey = Utilities.getUuid()
    + Utilities.getUuid();

  props.setProperty(
    SECURITY_API_KEY_NAME,
    apiKey
  );

  Logger.log("API Key：");
  Logger.log(apiKey);

}


// ========================================
// 获取 API Key
// ========================================

function getApiKey() {

  return PropertiesService
    .getScriptProperties()
    .getProperty(SECURITY_API_KEY_NAME);

}

// ========================================
// API Key 校验
// ========================================

function checkApiKey(data) {

  const apiKey = getApiKey();

  if (!apiKey) {

    securityLog(
      "-",
      "api_key_missing"
    );

    return false;

  }

  if (
    !data ||
    String(data.apiKey || "") !== apiKey
  ) {

    securityLog(
      "-",
      "api_key_fail"
    );

    return false;

  }

  return true;

}


// ========================================
// 安全日志
// ========================================

function securityLog(user, detail) {

  logAction(
    user || "-",
    SECURITY_ACTION,
    detail
  );

}

// ========================================
// 登录失败限制
// ========================================

function checkLoginLimit(username) {

  const cache = CacheService.getScriptCache();

  const lockKey =
    CACHE_LOGIN_LOCK_PREFIX + username;

  const lockValue =
    cache.get(lockKey);

  if (lockValue) {

    const now =
      Math.floor(Date.now() / 1000);

    const remain =
      Number(lockValue) - now;

    if (remain > 0) {

      return {
        success: false,
        locked: true,
        lockSeconds: remain,
        message: "登录失败次数过多，请稍后再试"
      };

    }

    // 理论上不会执行（Cache 到期会自动删除）
    cache.remove(lockKey);

  }

  return {
    success: true,
    locked: false,
    lockSeconds: 0
  };

}


// ========================================
// 登录失败次数 +1
// ========================================

function recordLoginFail(username) {

  const cache = CacheService.getScriptCache();

  const failKey =
    CACHE_LOGIN_FAIL_PREFIX + username;

  const lockKey =
    CACHE_LOGIN_LOCK_PREFIX + username;

  let count = Number(
    cache.get(failKey) || 0
  );

  count++;

  // 达到失败次数
  if (count >= LOGIN_MAX_FAIL) {

    const lockSeconds =
      LOGIN_LOCK_MINUTES * 60;

    // 保存解锁时间（Unix 时间戳，单位：秒）
    const unlockTime =
      Math.floor(Date.now() / 1000) + lockSeconds;

    cache.put(
      lockKey,
      String(unlockTime),
      lockSeconds
    );

    cache.remove(failKey);

    securityLog(
      username,
      "login_locked"
    );

    return {
      locked: true,
      lockSeconds: lockSeconds
    };

  }

  cache.put(
    failKey,
    String(count),
    LOGIN_LOCK_MINUTES * 60
  );

  securityLog(
    username,
    "login_fail_" + count
  );

  return {
    locked: false,
    failCount: count
  };

}


// ========================================
// 登录成功
// 清除失败次数
// ========================================

function clearLoginFail(username) {

  const cache = CacheService.getScriptCache();

  // 清除失败次数
  cache.remove(
    CACHE_LOGIN_FAIL_PREFIX + username
  );

  // 清除锁定状态
  cache.remove(
    CACHE_LOGIN_LOCK_PREFIX + username
  );

  securityLog(
    username,
    "login_success"
  );

}

// ========================================
// 获取登录失败次数（调试用）
// ========================================

function getLoginFailCount(username) {

  const cache = CacheService.getScriptCache();

  const key =
    CACHE_LOGIN_FAIL_PREFIX + username;

  return Number(cache.get(key) || 0);

}


// ========================================
// 手动解除登录锁定（管理员使用）
// ========================================

function unlockLogin(username) {

  clearLoginFail(username);

  securityLog(
    username,
    "login_unlock"
  );

}


function sha256(str) {
  const raw = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    str
  );

  return raw

  .map(function(byte) {

    let value =

      byte < 0

        ? byte + 256

        : byte;

    value =
      value.toString(16);

    return value.length === 1

      ? "0" + value

      : value;

  })

  .join("");
  
}




