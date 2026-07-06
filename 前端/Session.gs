/* =========================================================
 * Config
 * ========================================================= */
const SHEET_SESSIONS = "Sessions";



/* =========================================================
 * Session Helper
 * ========================================================= */
/**
 * 获取所有 Session
 */
function getSessionRows(sheet) {

  const lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  return sheet
    .getRange(2, 1, lastRow - 1, 3)
    .getValues();

}

/**
 * 根据 Token 查找 Session
 * 返回工作表行号，找不到返回 -1
 */
function findSessionByToken(sheet, token) {

  const rows =
    getSessionRows(sheet);

  for (let i = 0; i < rows.length; i++) {

    if (rows[i][0] === token) {

      return i + 2;

    }

  }

  return -1;

}

/**
 * 查找用户所有 Session
 * 返回工作表行号数组
 */
function findUserSessions(sheet, username) {

  const rows =
    getSessionRows(sheet);

  const result = [];

  for (let i = 0; i < rows.length; i++) {

    if (rows[i][1] === username) {

      result.push(i + 2);

    }

  }

  return result;

}

/* =========================================================
 * Business
 * ========================================================= */


function createSession(username) {
  const sheet = SpreadsheetApp
    .getActive()
    .getSheetByName(SHEET_SESSIONS);

  // 删除旧 Session（一个用户只保留一个）
  deleteUserSessions(username);

  const token =
    Utilities.getUuid();

  const expireAt =
    new Date(

      Date.now() +

      8 * 60 * 60 * 1000

    );

  sheet.appendRow([

    token,

    cleanUsername(username),

    expireAt

  ]);

  return token;
}


function validateToken(token) {
  if (!token) return null;

  const sheet = SpreadsheetApp
    .getActive()
    .getSheetByName(SHEET_SESSIONS);

  const rows =
    getSessionRows(
      sheet
    );

  const now =
    new Date();

  for (let i = 0; i < rows.length; i++) {

    const tokenValue =
      rows[i][0];

    const username =
      rows[i][1];

    const expireAt =
      rows[i][2];

    if (tokenValue !== token) {
      continue;
    }

    if (
      new Date(expireAt) < now
    ) {

      sheet.deleteRow(
        i + 2
      );

      return null;

    }

    return cleanUsername(
      username
    );

  }

  return null;

  
}


function deleteSession(token) {

  if (!token) {
    return false;
  }

  const sheet =
    SpreadsheetApp
      .getActive()
      .getSheetByName(SHEET_SESSIONS);

  const row =
    findSessionByToken(
      sheet,
      token
    );

  if (row === -1) {
    return false;
  }

  sheet.deleteRow(row);

  return true;

}


function deleteUserSessions(username) {

  const sheet =
    SpreadsheetApp
      .getActive()
      .getSheetByName(SHEET_SESSIONS);

  const rows =
    findUserSessions(
      sheet,
      cleanUsername(username)
    );

  for (

    let i = rows.length - 1;

    i >= 0;

    i--

  ) {

    sheet.deleteRow(
      rows[i]
    );

  }

}

function cleanupSessions() {

  const sheet =
    SpreadsheetApp
      .getActive()
      .getSheetByName(SHEET_SESSIONS);

  const rows =
    getSessionRows(
      sheet
    );

  if (rows.length === 0) {
    return;
  }

  const now =
    new Date();

  for (

    let i = rows.length - 1;

    i >= 0;

    i--

  ) {

    if (

      new Date(rows[i][2]) < now

    ) {

      sheet.deleteRow(
        i + 2
      );

    }

  }

}
