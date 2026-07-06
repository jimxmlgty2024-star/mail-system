/* =========================================================
 * User Helper
 * ========================================================= */
/**
 * 根据用户名查找用户所在行
 * 找不到返回 -1
 */
function findUserRow(sheet, username) {

  const target =
    cleanUsername(username);

  const lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {
    return -1;
  }

  const usernames =
    sheet
      .getRange(2, 1, lastRow - 1, 1)
      .getValues();

  for (let i = 0; i < usernames.length; i++) {

    if (

      cleanUsername(usernames[i][0]) === target

    ) {

      return i + 2;

    }

  }

  return -1;

}

/**
 * 读取用户整行数据
 */
function getUserRow(sheet, row) {

  return sheet
    .getRange(row, 1, 1, 4)
    .getValues()[0];

}

/**
 * 判断用户是否存在
 */
function userExists(sheet, username) {

  return findUserRow(

    sheet,

    username

  ) !== -1;

}

/**
 * 构造用户对象
 */
function createUserObject(userRow) {

  return {

    username:
      cleanUsername(userRow[0]),

    passwordHash:
      String(userRow[1]),

    role:
      cleanText(userRow[2]),

    status:
      cleanText(userRow[3])

  };

}


/* =========================================================
 * Business
 * ========================================================= */

function login(data) {

  const username = cleanUsername(data.username);
  const password = String(data.password || "");

  if (!username || !password) {
    return {
      success: false,
      message: "用户名或密码不能为空"
    };
  }

  // ========= 登录锁定检查 =========

  const limit = checkLoginLimit(username);

  if (!limit.success) {
    return limit;
  }

 // ========= 用户验证 =========
const sheet = SpreadsheetApp
  .getActive()
  .getSheetByName(SHEET_USERS);

const row =
  findUserRow(
    sheet,
    username
  );

if (row !== -1) {

  const user =
    createUserObject(
      getUserRow(
        sheet,
        row
      )
    );

  if (

    user.passwordHash === sha256(password) &&

    user.status === "active"

  ) {

    clearLoginFail(
      user.username
    );

    const token =
      createSession(
        user.username
      );

    logAction(

      user.username,

      "login",

      "登录成功"

    );

    return {

      success: true,

      username: user.username,

      role: user.role,

      token: token

    };

  }

}

  // 登录失败
  const fail = recordLoginFail(username);

  if (fail.locked) {

    return {
      success: false,
      locked: true,
      lockSeconds: fail.lockSeconds,
      message:
        "登录失败次数过多，请10分钟后再试"
    };

  }

  return {
    success: false,
    message: "用户名或密码错误"
  };

}

function createUser(data) {

  const operator =
    validateToken(data.token);

  if (!operator) {

    return {
      success: false,
      message: "登录已过期"
    };

  }

  const role =
    getUserRole(operator);

  if (role !== "admin") {

    return {
      success: false,
      message: "无权限"
    };

  }

  const newUsername =
    cleanUsername(data.username);

  const newPassword =
    String(data.password || "");

  if (!newUsername || !newPassword) {

    return {
      success: false,
      message: "用户名和密码不能为空"
    };

  }

  const roleToSave =
    data.role === "admin"
      ? "admin"
      : "user";

  const sheet =
    SpreadsheetApp
      .getActive()
      .getSheetByName(SHEET_USERS);

  if (!sheet) {

    return {
      success: false,
      message: "用户表不存在"
    };

  }

  if (

    userExists(
      sheet,
      newUsername
    )

  ) {

    return {

      success: false,

      message: "用户已存在"

    };

  }

  sheet.appendRow([

    newUsername,

    sha256(newPassword),

    roleToSave,

    "active"

  ]);

  logAction(

    operator,

    "create_user",

    newUsername

  );

  return {

    success: true,

    message: "用户创建成功"

  };

}

function getUserRole(username) {

  username =
    cleanUsername(username);

  const sheet =
    SpreadsheetApp
      .getActive()
      .getSheetByName(SHEET_USERS);

  const row =
    findUserRow(
      sheet,
      username
    );

  if (row === -1) {
    return null;
  }

  const user =
    createUserObject(
      getUserRow(
        sheet,
        row
      )
    );

  if (
    user.status !== "active"
  ) {
    return null;
  }

  return user.role;

}

