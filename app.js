/* =========================================================
 * Global
 * ========================================================= */

const API_URL = "/api";

let currentUser = "";
let currentRole = "";
let sessionToken = "";

let currentSearchedEmail = "";

let otpTimer = null;
let currentOtpSecret = "";

let loginLockTimer = null;
let loginLocked = false;

/* =========================================================
 * Page
 * ========================================================= */

function showPage(pageId) {

  // 页面切换前统一处理
  stopOtpTimer();

  clearAllResults();

  currentSearchedEmail = "";

  const recycleBtn =
    document.getElementById("recycleBtn");

  if (recycleBtn) {

    recycleBtn.classList.add("hidden");

  }

  // 隐藏所有页面
  document
    .querySelectorAll(".page")
    .forEach(page => {

      page.classList.add("hidden");

    });

  // 显示目标页面
  const page =
    document.getElementById(pageId);

  if (page) {

    page.classList.remove("hidden");

  }

}

function showDashboard() {

  showPage("dashboardPage");

}

function showAssignPage() {

  showPage("assignPage");

  document
    .getElementById("assignName")
    .focus();

}

function showUploadPage() {

  showPage("uploadPage");

  document
    .getElementById("uploadAccount")
    .focus();

}

function showSearchPage() {

  showPage("searchPage");

  const input =
    document.getElementById("searchKeyword");

  input.value = "";

  input.focus();

}

function showStatsPage() {

  showPage("statsPage");

}

function showUserPage() {

  showPage("userPage");

}

/* =========================================================
 * Utils
 * ========================================================= */







function isEmpty(value) {

  return String(value || "").trim() === "";

}

function escapeHtml(text) {

  if (text === null || text === undefined) {
    return "";
  }

  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

}

function formatDate(value) {

  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (isNaN(date.getTime())) {
    return value;
  }

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  const h = String(date.getHours()).padStart(2, "0");
  const i = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");

  return `${y}-${m}-${d} ${h}:${i}:${s}`;

}


async function copyText(text, title = "内容") {

  if (!text) {
    showToast("没有可复制的内容", "warning");
    return;
  }

  try {

    await navigator.clipboard.writeText(String(text));

    showToast(title + " 已复制");

  } catch (e) {

    const textarea =
      document.createElement("textarea");

    textarea.value = String(text);

    document.body.appendChild(textarea);

    textarea.select();

    document.execCommand("copy");

    document.body.removeChild(textarea);

    showToast(title + " 已复制");

  }

}

function setButtonLoading(button, loadingText) {

  if (!button) {
    return () => {};
  }

  const oldText = button.innerHTML;
  const oldDisabled = button.disabled;

  button.disabled = true;
  button.classList.add("loading");
  button.innerHTML = loadingText;

  return function restore() {

    // 登录按钮正在倒计时，不恢复
    if (
	  button.id === "loginBtn" &&
	  loginLocked
	) {
	  return;
	}

    button.disabled = oldDisabled;
    button.classList.remove("loading");
    button.innerHTML = oldText;

  };

}

function showToast(message, type = "success") {

  const container =
    document.getElementById("toastContainer");

  if (!container) {
    alert(message);
    return;
  }

  const toast = document.createElement("div");

  toast.className = "toast " + type;
  toast.innerText = message;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  setTimeout(() => {

    toast.classList.remove("show");

    setTimeout(() => {

      toast.remove();

    }, 300);

  }, 1800);

}


/* =========================================================
 * API
 * ========================================================= */

async function apiRequest(payload) {

  try {

    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });

    if (!response.ok) {

      showToast(
        "服务器错误：" + response.status,
        "error"
      );

      return null;

    }

    const data = await response.json();

    if (
      data &&
      data.message === "登录已过期"
    ) {

      showToast("登录已过期，请重新登录", "warning");

      await logout();

      return null;

    }

    return data;

  } catch (err) {

    console.error(err);

    showToast(
      "网络异常：" + err.message,
      "error"
    );

    return null;

  }

}

async function request(payload) {

  const data =
    await apiRequest(payload);

  if (!data) {

    return null;

  }

  return data;

}


/* =========================================================
 * OTP
 * ========================================================= */

function startOtpTimer(
  secret,
  codeId,
  remainId
) {

  stopOtpTimer();

  if (!secret) return;

  currentOtpSecret = secret;

  otpTimer = setInterval(async () => {

    const codeNode =
      document.getElementById(codeId);

    const remainNode =
      document.getElementById(remainId);

    if (!codeNode || !remainNode) {
      stopOtpTimer();
      return;
    }

    let remain =
      parseInt(remainNode.innerText, 10);

    if (isNaN(remain)) {
      remain = 0;
    }

    remain--;

    if (remain <= 0) {

      const data = await apiRequest({

        action: "refresh_otp",

        token: sessionToken,

        secret: currentOtpSecret

      });

      if (
        data &&
        data.success
      ) {

        codeNode.innerText =
          data.otpCode;

        remainNode.innerText =
          data.otpRemain;

      }

    } else {

      remainNode.innerText = remain;

    }

  }, 1000);

}

function stopOtpTimer() {

  if (otpTimer) {

    clearInterval(otpTimer);

    otpTimer = null;

  }

}



/* =========================================================
 * Result
 * ========================================================= */


function getResultElement(mode) {

  switch (mode) {

    case "assign":
      return document.getElementById("assignResult");

    case "search":
      return document.getElementById("searchResult");

    case "upload":
      return document.getElementById("uploadResult");

    default:
      return null;

  }

}
function clearResult(mode) {

  const result =
    getResultElement(mode);

  if (result) {

    result.innerHTML = "";

  }

}

function clearAllResults() {

  clearResult("assign");

  clearResult("search");

  clearResult("upload");

}



function showEmailResult(mode, email) {

  const result =
    getResultElement(mode);

  if (!result) return;

  result.innerHTML =
    renderEmailCard(email, mode);

  // upload 页面不启动 OTP
  if (
    mode === "upload" ||
    !email.otpCode
  ) {
    return;
  }

  let prefix;

  switch (mode) {

    case "assign":
      prefix = "assignOtp";
      break;

    case "search":
      prefix = "searchOtp";
      break;

    default:
      return;

  }

  startOtpTimer(

    email.otp,

    prefix + "Code",

    prefix + "Remain"

  );

}

function renderEmailCard(email, mode = "assign") {

  let html = `
  <div class="result-card">
  `;

  html += renderCopyRow(
    "邮箱",
    email.account,
    "邮箱"
  );

  html += renderCopyRow(
    "密码",
    email.password,
    "密码"
  );

  
  let prefix;
  
  switch (mode) {
	case "assign":
      prefix = "assignOtp";
	  break;

    case "upload":
      prefix = "uploadOtp";
      break;

    default:
      prefix = "searchOtp";
  }
  
  if (
    email.otp &&
    mode !== "upload"
  ) {
	
	html += renderOtpRow(email, prefix);
  }
  

  html += renderCopyRow(
    "辅助邮箱",
    email.recoveryEmail,
    "辅助邮箱"
  );

  html += renderCopyRow(
    "备注",
    email.remark,
    "备注"
  );

  if (
    mode === "search" ||
    mode === "upload"
  ) {

    html += renderCopyRow(
      "状态",
      email.status
    );
  }
  
  if (mode === "search") {

    html += renderCopyRow(
      "领取人",
      email.assignName
    );  

    html += renderCopyRow(
      "使用人",
      email.assignPerson
    );

    html += renderCopyRow(
      "领取时间",
	  email.assignTime
	    ? formatDate(email.assignTime)
		: ""
    );
  }
  if (
    mode === "search" ||
    mode === "upload"
  ) {
	  
    html += renderCopyRow(
      "上传人",
      email.uploadedBy
    );

    html += renderCopyRow(
      "上传时间",
	email.uploadTime
      ? formatDate(email.uploadTime)
      : ""  

    );

  }

  html += `
  </div>
  `;

  return html;

}

function renderCopyRow(label, value, copyName = label) {

  value = value || "";

  return `
    <div class="result-item">

      <div class="result-label">
        ${escapeHtml(label)}
      </div>

      <div class="result-value">

        <span>
          ${escapeHtml(String(value))}
        </span>

        ${
          value
            ? `<span
                 class="copy-icon"
                 onclick='copyText(${JSON.stringify(String(value))}, ${JSON.stringify(copyName)})'
                 title="复制">📋</span>`
            : ""
        }

      </div>

    </div>
  `;

}

function renderOtpRow(email, prefix = "otp") {

  if (!email.otpCode) {
    return "";
  }

  return `

    <div class="result-item">

      <div class="result-label">
        当前验证码
      </div>

      <div class="result-value">

        <span id="${prefix}Code">
          ${escapeHtml(email.otpCode)}
        </span>

        <span
          class="copy-icon"
          onclick="copyText(document.getElementById('${prefix}Code').innerText,'OTP验证码')"
          title="复制">
          📋
        </span>

      </div>

    </div>

    <div class="result-item">

      <div class="result-label">
        剩余秒数
      </div>

      <div class="result-value">

        <span id="${prefix}Remain">
          ${email.otpRemain}
        </span>

      </div>

    </div>

  `;

}

function renderStatsCard(data) {

  const total = Number(data.total) || 0;
  const used = Number(data.used) || 0;
  const unused = Number(data.unused) || 0;

  const percent =
    total > 0
      ? (used / total * 100).toFixed(1)
      : "0.0";

  return `

    <div class="result-card">

      <div class="stats-card">

        <div class="stats-item">
          <span class="stats-title">邮箱总数</span>
          <span class="stats-number">${total}</span>
        </div>

        <div class="stats-item">
          <span class="stats-title">已使用</span>
          <span class="stats-number">${used}</span>
        </div>

        <div class="stats-item">
          <span class="stats-title">未使用</span>
          <span class="stats-number">${unused}</span>
        </div>

        <div class="stats-item">
          <span class="stats-title">使用率</span>
          <span class="stats-number">${percent}%</span>
        </div>

      </div>

    </div>

  `;

}


/* =========================================================
 * Business-login
 * ========================================================= */

async function login() {

  const btn = document.getElementById("loginBtn");
  const restore = setButtonLoading(btn, "登录中...");

  try {

    const username =
      document.getElementById("username").value.trim();

    const password =
      document.getElementById("password").value;

    if (isEmpty(username) || isEmpty(password)) {
      showToast("请输入用户名和密码", "warning");
      return;
    }

    const data = await apiRequest({
      action: "login",
      username,
      password
    });

    if (!data) return;

    if (!data.success) {
	  showToast(data.message, "error");
	  document.getElementById("loginMessage").innerText =
	    data.message;
		
      if (data.locked) {
		  // 保存锁定结束时间（毫秒）
		  localStorage.setItem(
		    "loginLockUntil",
			Date.now() + data.lockSeconds * 1000
		  );

		  startLoginCountdown(data.lockSeconds);
	  }

      return;
	}

    currentUser = data.username;
    currentRole = data.role;
    sessionToken = data.token;
	// 登录成功，清除锁定记录
    localStorage.removeItem("loginLockUntil");

    document.getElementById("password").value = "";

    document.getElementById("welcomeText").innerText =
      "欢迎：" + currentUser + "（" + currentRole + "）";

    document
      .getElementById("adminButtons")
      .classList.toggle(
        "hidden",
        currentRole !== "admin"
      );

    showToast("登录成功");

    showDashboard();

  } finally {

    restore();

  }

}

async function logout() {

  stopOtpTimer();

  const btn =
    document.getElementById("logoutBtn");

  const restore =
    btn
      ? setButtonLoading(btn, "退出中...")
      : () => {};

  try {

    if (sessionToken) {

      await fetch(API_URL, {

        method: "POST",

        body: JSON.stringify({

          action: "logout",

          token: sessionToken

        })

      });

    }

    currentUser = "";
    currentRole = "";
    sessionToken = "";
    currentSearchedEmail = "";

    document.getElementById("username").value = "";
    document.getElementById("password").value = "";
    document.getElementById("loginMessage").innerText = "";

    showPage("loginPage");

  } finally {

    restore();

  }

}

function startLoginCountdown(seconds) {

  if (loginLockTimer) {
    clearInterval(loginLockTimer);
  }
  
  loginLocked = true;   // 新增
  
  const btn = document.getElementById("loginBtn");

  btn.disabled = true;

  update();

  loginLockTimer = setInterval(update, 1000);

  function update() {

    if (seconds <= 0) {

      clearInterval(loginLockTimer);
	  
	  loginLockTimer = null;   // 新增
	  loginLocked = false;     // 新增

      btn.disabled = false;
	  btn.classList.remove("loading");   // 新增这一行
      btn.innerText = "登录";

      return;

    }

    const m = Math.floor(seconds / 60);
    const s = seconds % 60;

    btn.innerText =
      `登录 (${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")})`;

    seconds--;

  }

}




/* =========================================================
 * Business-Email
 * ========================================================= */
async function assignEmail() {

  const btn =
    document.getElementById("assignBtn");

  const restore =
    setButtonLoading(btn, "领取中...");

  stopOtpTimer();

  clearResult("assign");

  try {

    const assignName =
      document.getElementById("assignName").value.trim();

    const assignPerson =
      document.getElementById("assignPerson").value.trim();

    if (isEmpty(assignName) || isEmpty(assignPerson)) {

      showToast("请填写领取人和使用人", "warning");

      return;

    }

    const data = await apiRequest({

      action: "assign",

      token: sessionToken,

      assignName,

      assignPerson

    });

    if (!data) return;

    // 统一显示邮箱信息（自动处理 OTP）
    showEmailResult(
      "assign",
      data.email
    );

    document.getElementById("assignName").value = "";
    document.getElementById("assignPerson").value = "";

    showToast("邮箱领取成功");

  } finally {

    restore();

  }

}

async function uploadEmail() {

  const btn =
    document.getElementById("uploadBtn");

  const restore =
    setButtonLoading(btn, "上传中...");

  try {

    const account =
      document.getElementById("uploadAccount").value.trim();

    const password =
      document.getElementById("uploadPassword").value;

    const otp =
      document.getElementById("uploadOtp").value.trim();

    const recoveryEmail =
      document.getElementById("uploadRecovery").value.trim();

    const remark =
      document.getElementById("uploadRemark").value.trim();

    if (isEmpty(account) || isEmpty(password)) {

      showToast("邮箱和密码不能为空", "warning");

      return;

    }

    const data = await apiRequest({

      action: "upload",

      token: sessionToken,

      account,

      password,

      otp,

      recoveryEmail,

      remark

    });

    if (!data) return;

    if (!data.success) {

      showToast(data.message, "error");

      document.getElementById("uploadMessage").innerText =
        data.message;

      return;

    }

    // 清空输入框
    clearUploadForm();

    document.getElementById("uploadMessage").innerText = "";

    // 统一显示上传结果（upload 模式不启动 OTP）
    if (data.email) {

      showEmailResult(
        "upload",
        data.email
      );

    }

    // 光标回到邮箱输入框
    document
      .getElementById("uploadAccount")
      .focus();

    showToast("上传成功");

  } finally {

    restore();

  }

}

async function searchEmail() {

  const btn =
    document.getElementById("searchBtn");

  const restore =
    setButtonLoading(btn, "查询中...");

  stopOtpTimer();

  clearResult("search");

  currentSearchedEmail = "";

  document
    .getElementById("recycleBtn")
    .classList.add("hidden");

  try {

    const keyword =
      document
        .getElementById("searchKeyword")
        .value
        .trim();

    if (isEmpty(keyword)) {

      showToast(
        "管理员：支持模糊查询；普通用户：请输入完整邮箱账号并以 @ 结尾（如 apple@）",
        "warning"
      );

      return;

    }

    const data = await apiRequest({

      action: "search",

      token: sessionToken,

      keyword

    });

    if (!data) return;

    if (!data.success) {

      showToast(data.message, "error");

      clearResult("search");

      return;

    }

    currentSearchedEmail =
      data.email.account;

    // 统一显示邮箱信息（自动处理 OTP）
    showEmailResult(
      "search",
      data.email
    );

    if (
      String(data.email.status).trim() === "已使用"
    ) {

      document
        .getElementById("recycleBtn")
        .classList.remove("hidden");

    }

    showToast("查询成功");

  } finally {

    restore();

  }

}

async function recycleCurrentEmail() {

  if (!currentSearchedEmail) {

    showToast("没有可回收邮箱", "warning");

    return;

  }

  const ok = confirm(

    "确认回收邮箱？\n\n" +

    currentSearchedEmail

  );

  if (!ok) {
    return;
  }

  const btn =
    document.getElementById("recycleBtn");

  const restore =
    setButtonLoading(btn, "回收中...");

  try {

    const data = await apiRequest({

      action: "recycle",

      token: sessionToken,

      account: currentSearchedEmail

    });

    if (!data) return;

    if (!data.success) {

      showToast(data.message, "error");

      return;

    }

    showToast("邮箱已回收");

    await searchEmail();

  } finally {

    restore();

  }

}

function clearUploadForm() {

  document.getElementById("uploadAccount").value = "";

  document.getElementById("uploadPassword").value = "";

  document.getElementById("uploadOtp").value = "";

  document.getElementById("uploadRecovery").value = "";

  document.getElementById("uploadRemark").value = "";

  document.getElementById("uploadMessage").innerText = "";

}


/* =========================================================
 * Business-User
 * ========================================================= */

async function createUser() {

  const btn =
    document.getElementById("createUserBtn");

  const restore =
    setButtonLoading(btn, "创建中...");

  try {

    const username =
      document.getElementById("newUsername").value.trim();

    const password =
      document.getElementById("newPassword").value;

    const role =
      document.getElementById("newRole").value;

    if (isEmpty(username) || isEmpty(password)) {

      showToast("用户名和密码不能为空", "warning");

      return;

    }

    const data = await apiRequest({

      action: "create_user",

      token: sessionToken,

      username,

      password,

      role

    });

    if (!data) return;

    if (!data.success) {

      showToast(data.message, "error");

      document.getElementById("createUserMessage").innerText =
        data.message;

      return;

    }

    document.getElementById("newUsername").value = "";
    document.getElementById("newPassword").value = "";

    document.getElementById("createUserMessage").innerText =
      "";

    showToast("用户创建成功");

  } finally {

    restore();

  }

}











/* =========================================================
 * Business-Stats
 * ========================================================= */
async function loadStats() {

  const btn =
    document.getElementById("statsBtn");

  const restore =
    setButtonLoading(btn, "刷新中...");

  try {

    const data = await apiRequest({

      action: "stats",

      token: sessionToken

    });

    if (!data) return;

    if (!data.success) {

      showToast(data.message, "error");

      document.getElementById("statsResult").innerText =
        data.message;

      return;

    }

    document.getElementById("statsResult").innerHTML =

      renderStatsCard(data);

  } finally {

    restore();

  }

}








/* =========================================================
 * Business-Dashboard
 * ========================================================= */






/* =========================================================
 * Initialization
 * ========================================================= */


document.addEventListener("DOMContentLoaded", function () {

  const lockUntil = Number(
    localStorage.getItem("loginLockUntil")
  );

  if (!lockUntil) {
    return;
  }

  const remain = Math.ceil(
    (lockUntil - Date.now()) / 1000
  );

  if (remain > 0) {

    startLoginCountdown(remain);

  } else {

    localStorage.removeItem("loginLockUntil");

  }

});
























