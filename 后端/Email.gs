/* =========================================================
 * Email Helper
 * ========================================================= */

/**
 * 根据邮箱账号查找所在行
 * 找不到返回 -1
 */
function findEmailRow(sheet, account) {

  const target =
    cleanEmail(account);

  const lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {
    return -1;
  }

  const accounts =
    sheet
      .getRange(2, 1, lastRow - 1, 1)
      .getValues();

  for (let i = 0; i < accounts.length; i++) {

    if (

      cleanEmail(accounts[i][0]) === target

    ) {

      return i + 2;

    }

  }

  return -1;

}

/**
 * 读取邮箱整行数据
 */
function getEmailRow(sheet, row) {

  return sheet
    .getRange(row, 1, 1, 11)
    .getValues()[0];

}

/**
 * 更新邮箱状态
 */
function updateEmailStatus(

  sheet,

  row,

  status,

  assignName,

  assignPerson,

  assignTime

) {

  sheet
    .getRange(row, 6, 1, 4)
    .setValues([[

      status,

      assignName,

      assignPerson,

      assignTime

    ]]);

}


/**
 * 构造邮箱对象
 */
function createEmailObject(emailRow) {

  const otpSecret =
    cleanText(emailRow[2]);

  return {

    account:
      cleanEmail(emailRow[0]),

    password:
      cleanText(emailRow[1]),

    otp:
      otpSecret,

    otpCode:
      otpSecret
        ? generateOtpCode(otpSecret)
        : "",

    otpRemain:
      otpSecret
        ? getOtpRemainSeconds()
        : "",

    recoveryEmail:
      cleanEmail(emailRow[3]),

    remark:
      cleanText(emailRow[4]),

    status:
      cleanText(emailRow[5]),

    assignName:
      cleanText(emailRow[6]),

    assignPerson:
      cleanText(emailRow[7]),

    assignTime:
      emailRow[8],

    uploadedBy:
      cleanText(emailRow[9]),

    uploadTime:
      emailRow[10]

  };

}



/* =========================================================
 * Business
 * ========================================================= */

/**
 * 根据邮箱账号查找所在行
 * 找不到返回 -1
 */

function assignEmail(data) {

  const username =
    validateToken(data.token);

  if (!username) {

    return {
      success: false,
      message: "登录已过期"
    };

  }

  const assignName =
    cleanText(data.assignName);

  const assignPerson =
    cleanText(data.assignPerson);

  if (!assignName || !assignPerson) {

    return {
      success: false,
      message: "领取人和使用人不能为空"
    };

  }

  const sheet =
    SpreadsheetApp
      .getActive()
      .getSheetByName(SHEET_EMAILS);

  const lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {

    return {
      success: false,
      message: "没有可用邮箱"
    };

  }

  const statusCol =
    sheet
      .getRange(2, 6, lastRow - 1, 1)
      .getValues();

  for (let i = 0; i < statusCol.length; i++) {

    if (
      cleanText(statusCol[i][0]) !== "未使用"
    ) {
      continue;
    }

    const row =
      i + 2;

    const assignTime =
      new Date();

    updateEmailStatus(

      sheet,

      row,

      "已使用",

      assignName,

      assignPerson,

      assignTime

    );

    const emailRow =
      getEmailRow(
        sheet,
        row
      );

    logAction(

      username,

      "assign",

      cleanEmail(emailRow[0])

    );

    const email =
      createEmailObject(emailRow);

    email.status = "已使用";
    email.assignName = assignName;
    email.assignPerson = assignPerson;
    email.assignTime = assignTime;

    return {

      success: true,

      email: email

    };

  }

  return {

    success: false,

    message: "没有可用邮箱"

  };

}

function uploadEmail(data) {

  const username =
    validateToken(data.token);

  if (!username) {

    return {
      success: false,
      message: "登录已过期"
    };

  }

  const account =
    cleanEmail(data.account);

  const password =
    cleanText(data.password);

  const otp =
    cleanText(data.otp);

  const recoveryEmail =
    cleanEmail(data.recoveryEmail);

  const remark =
    cleanText(data.remark);

  if (!account || !password) {

    return {
      success: false,
      message: "邮箱和密码不能为空"
    };

  }

  const sheet =
    SpreadsheetApp
      .getActive()
      .getSheetByName(SHEET_EMAILS);

  if (

    findEmailRow(
      sheet,
      account
    ) !== -1

  ) {

    return {

      success: false,

      message: "邮箱已存在"

    };

  }

  const uploadTime =
    new Date();

  sheet.appendRow([

    account,

    password,

    otp,

    recoveryEmail,

    remark,

    "未使用",

    "",

    "",

    "",

    cleanUsername(username),

    uploadTime

  ]);

  logAction(

    cleanUsername(username),

    "upload",

    account

  );

  const email =
    createEmailObject([

      account,

      password,

      otp,

      recoveryEmail,

      remark,

      "未使用",

      "",

      "",

      "",

      cleanUsername(username),

      uploadTime

    ]);

  return {

    success: true,

    message: "上传成功",

    email: email

  };

}


function searchEmail(data) {

  const username =
    validateToken(data.token);

  if (!username) {

    return {
      success: false,
      message: "登录已过期"
    };

  }

  const keyword =
    cleanEmail(data.keyword);

  if (!keyword) {

    return {
      success: false,
      message: "请输入邮箱关键字"
    };

  }

  const role =
    getUserRole(username);

  if (!role) {

    return {
      success: false,
      message: "无权限"
    };

  }

  // 普通用户限制
  if (

    role !== "admin" &&

    !keyword.endsWith("@")

  ) {

    return {

      success: false,

      message:
        "请输入完整邮箱账号（@前部分）并以 @ 结尾，例如：apple@"

    };

  }

  const sheet =
    SpreadsheetApp
      .getActive()
      .getSheetByName(SHEET_EMAILS);

  const lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {

    return {

      success: false,

      message: "邮箱库为空"

    };

  }

  const accountCol =
    sheet
      .getRange(2, 1, lastRow - 1, 1)
      .getValues();

  for (let i = 0; i < accountCol.length; i++) {

    const account =
      cleanEmail(accountCol[i][0]);

    let matched = false;

    if (role === "admin") {

      matched =
        account.includes(keyword);

    } else {

      const localPart =
        account.split("@")[0];

      matched =
        keyword === localPart + "@";

    }

    if (!matched) {
      continue;
    }

    const row =
      i + 2;

    const email =
      createEmailObject(

        getEmailRow(

          sheet,

          row

        )

      );

    return {

      success: true,

      email: email

    };

  }

  return {

    success: false,

    message: "未找到邮箱"

  };

}



function recycleEmail(data) {

  const username =
    validateToken(data.token);

  if (!username) {

    return {

      success: false,

      message: "登录已过期"

    };

  }

  const role =
    getUserRole(username);

  if (role !== "admin") {

    return {

      success: false,

      message: "无权限"

    };

  }

  const sheet =
    SpreadsheetApp
      .getActive()
      .getSheetByName(SHEET_EMAILS);

  const row =
    findEmailRow(
      sheet,
      data.account
    );

  if (row === -1) {

    return {

      success: false,

      message: "未找到邮箱"

    };

  }

  const emailRow =
    getEmailRow(
      sheet,
      row
    );

  const status =
    cleanText(emailRow[5]);

  if (status === "未使用") {

    return {

      success: false,

      message: "该邮箱本来就是未使用"

    };

  }

  updateEmailStatus(

    sheet,

    row,

    "未使用",

    "",

    "",

    ""

  );

  logAction(

    username,

    "recycle",

    cleanEmail(data.account)

  );

  return {

    success: true,

    message: "邮箱回收成功"

  };

}

function getStats(data) {
  const username = validateToken(data.token);

  if (!username) {
    return {
      success: false,
      message: "登录已过期"
    };
  }

  const role = getUserRole(username);

  if (!role) {
    return {
      success: false,
      message: "无权限"
    };
  }

  const sheet = SpreadsheetApp
    .getActive()
    .getSheetByName(SHEET_EMAILS);

  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return {
      success: true,
      total: 0,
      used: 0,
      unused: 0
    };
  }

  const statusCol = sheet
    .getRange(2, 6, lastRow - 1, 1)
    .getValues();

  let used = 0;
  let unused = 0;

  for (let i = 0; i < statusCol.length; i++) {
    if (cleanText(statusCol[i][0]) === "已使用") {
      used++;
    } else {
      unused++;
    }
  }

  return {
    success: true,
    total: lastRow - 1,
    used,
    unused
  };
}

function logAction(user, action, detail) {
  const sheet = SpreadsheetApp
    .getActive()
    .getSheetByName(SHEET_LOGS);

  if (!sheet) return;

  sheet.appendRow([
    new Date(),
    cleanUsername(user),
    cleanText(action),
    cleanText(detail)
  ]);
}

function refreshOtp(data) {
  const username = validateToken(data.token);

  if (!username) {
    return {
      success: false,
      message: "登录已过期"
    };
  }

  if (!data.secret) {
    return {
      success: false,
      message: "没有OTP"
    };
  }

  return {
    success: true,
    otpCode: generateOtpCode(data.secret),
    otpRemain: getOtpRemainSeconds()
  };
}
