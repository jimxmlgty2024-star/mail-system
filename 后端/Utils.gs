// ========================================
// Utils.gs
// 公共工具函数
// ========================================

// 去除首尾空格
function cleanText(value) {

  return String(value || "")
    .replace(/\u00A0/g, " ")
    .trim();

}

// 邮箱统一格式
function cleanEmail(value) {

  return cleanText(value)
    .toLowerCase();

}

// 是否为空
function isEmpty(value) {

  return cleanText(value) === "";

}

// 安全字符串（避免 null）
function safeString(value) {
  return String(value || "");
}

// 是否为空白字符串

function cleanUsername(value) {

  return cleanText(value)
    .toLowerCase();

}
