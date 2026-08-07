/**
 * AVH FMS Training LMS — Google Sheets Backend
 * -----------------------------------------------------------
 * Deploy this as a Web App (see setup guide) and paste the
 * resulting URL into the LMS admin dashboard: Settings (gear
 * icon) -> Google Sheet Sync -> Apps Script Web App URL.
 *
 * It creates two sheets automatically the first time data is
 * received:
 *   - "Employees": one row per registered employee (upserted by ID)
 *   - "Results":   one row per exam attempt (every attempt kept)
 *
 * When an employee PASSES, this script also auto-generates a
 * certificate PDF, saves it into a Google Drive folder named
 * "AVH FMS Certificates" (created automatically the first time),
 * and writes a shareable link into the "Certificate Link" column.
 *
 * It also manages employee login accounts (email + password hash)
 * in an "Accounts" sheet, and supports email-based password reset:
 * a 6-digit code is emailed via MailApp and logged in a
 * "PasswordResets" sheet (valid for 30 minutes).
 *
 * NOTE: this version uses Slides, Drive, and Gmail (MailApp) services,
 * so after pasting this updated code you must create a NEW deployment
 * version (Deploy -> Manage deployments -> Edit -> New version) and
 * re-authorize the extra permissions when prompted.
 * -----------------------------------------------------------
 */

const EMP_SHEET_NAME = 'Employees';
const RESULT_SHEET_NAME = 'Results';
const CERT_FOLDER_NAME = 'AVH FMS Certificates';
const ACCOUNTS_SHEET_NAME = 'Accounts';
const RESETS_SHEET_NAME = 'PasswordResets';
const RESET_CODE_VALID_MINUTES = 30;

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (body.type === 'employee') {
      const sh = getOrCreateSheet(ss, EMP_SHEET_NAME,
        ['Employee ID', 'Name', 'Department', 'Email', 'Language', 'Registered At']);
      upsertRowByKey(sh, body.data.id, [
        body.data.id, body.data.name, body.data.department, body.data.email || '',
        body.data.lang || '', body.data.createdAt || ''
      ]);
    } else if (body.type === 'result') {
      const sh = getOrCreateSheet(ss, RESULT_SHEET_NAME,
        ['Employee ID', 'Name', 'Department', 'Score', 'Total', 'Percent',
         'Status', 'Date', 'Certificate ID', 'Certificate Link', 'Answers JSON']);

      let certLink = '';
      if (body.data.passed && body.data.certId) {
        try {
          certLink = generateCertificatePdf(body.data);
        } catch (certErr) {
          certLink = 'ERROR: ' + certErr; // keep the row even if PDF generation fails
        }
      }

      sh.appendRow([
        body.data.id, body.data.name, body.data.department,
        body.data.score, body.data.total, body.data.percent,
        body.data.passed ? 'Pass' : 'Fail', body.data.date,
        body.data.certId || '', certLink, JSON.stringify(body.data.answers || [])
      ]);
    } else if (body.type === 'account') {
      const sh = getOrCreateSheet(ss, ACCOUNTS_SHEET_NAME,
        ['Email', 'Name', 'Employee ID', 'Department', 'Password Hash', 'Updated At']);
      upsertRowByKey(sh, String(body.data.email).toLowerCase(), [
        String(body.data.email).toLowerCase(), body.data.name, body.data.id,
        body.data.department, body.data.passwordHash, new Date().toISOString()
      ]);
      return jsonOut({ ok: true });
    } else if (body.type === 'verifyLogin') {
      return jsonOut(verifyLogin(body.data));
    } else if (body.type === 'requestReset') {
      return jsonOut(requestPasswordReset(body.data));
    } else if (body.type === 'confirmReset') {
      return jsonOut(confirmPasswordReset(body.data));
    }

    return jsonOut({ ok: true });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------------- Accounts / authentication ---------------- */
function findAccountRow(sh, email) {
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === String(email).toLowerCase()) return { rowIndex: i + 1, row: data[i] };
  }
  return null;
}

function verifyLogin(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(ACCOUNTS_SHEET_NAME);
  if (!sh) return { ok: false, error: 'no_accounts' };
  const found = findAccountRow(sh, data.email);
  if (!found) return { ok: false, error: 'no_account' };
  const [email, name, id, department, passwordHash] = found.row;
  if (String(passwordHash) !== String(data.passwordHash)) return { ok: false, error: 'bad_password' };
  return { ok: true, name: name, id: id, department: department };
}

function requestPasswordReset(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const accSh = ss.getSheetByName(ACCOUNTS_SHEET_NAME);
  if (!accSh) return { ok: false, error: 'no_account' };
  const found = findAccountRow(accSh, data.email);
  if (!found) return { ok: false, error: 'no_account' };

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const sh = getOrCreateSheet(ss, RESETS_SHEET_NAME, ['Email', 'Code', 'Created At', 'Used']);
  sh.appendRow([String(data.email).toLowerCase(), code, new Date().toISOString(), 'NO']);

  const name = found.row[1] || '';
  const subject = 'AVH FMS Training — Password Reset Code';
  const bodyText = 'Hello ' + name + ',\n\n' +
    'Your password reset code for the AVH Facility Management & Safety Training platform is:\n\n' +
    code + '\n\n' +
    'This code is valid for ' + RESET_CODE_VALID_MINUTES + ' minutes. If you did not request this, you can ignore this email.\n\n' +
    '— Augusta Victoria Hospital, Nursing Education & Safety Committee';
  try {
    MailApp.sendEmail(data.email, subject, bodyText);
  } catch (mailErr) {
    return { ok: false, error: 'mail_failed: ' + mailErr };
  }
  return { ok: true };
}

function confirmPasswordReset(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(RESETS_SHEET_NAME);
  if (!sh) return { ok: false, error: 'no_code' };
  const values = sh.getDataRange().getValues();
  const now = new Date();
  let matchRow = -1;
  for (let i = values.length - 1; i >= 1; i--) { // most recent first
    const [email, code, createdAt, used] = values[i];
    if (String(email).toLowerCase() === String(data.email).toLowerCase() && String(code) === String(data.code) && String(used) === 'NO') {
      const created = new Date(createdAt);
      const minutesElapsed = (now - created) / 60000;
      if (minutesElapsed <= RESET_CODE_VALID_MINUTES) { matchRow = i + 1; }
      break;
    }
  }
  if (matchRow === -1) return { ok: false, error: 'invalid_or_expired' };

  sh.getRange(matchRow, 4).setValue('YES'); // mark code as used

  const accSh = ss.getSheetByName(ACCOUNTS_SHEET_NAME);
  const found = findAccountRow(accSh, data.email);
  if (!found) return { ok: false, error: 'no_account' };
  accSh.getRange(found.rowIndex, 5).setValue(data.passwordHash); // Password Hash column
  accSh.getRange(found.rowIndex, 6).setValue(new Date().toISOString()); // Updated At column

  return { ok: true, name: found.row[1], id: found.row[2], department: found.row[3] };
}

/**
 * Builds a one-slide certificate with Google Slides, exports it as a
 * PDF, saves the PDF into the certificates Drive folder, deletes the
 * temporary Slides file, and returns the PDF's shareable Drive URL.
 */
function generateCertificatePdf(data) {
  const folder = getOrCreateFolder(CERT_FOLDER_NAME);

  const pres = SlidesApp.create('TEMP_CERT_' + data.certId);
  const presId = pres.getId();
  const slide = pres.getSlides()[0];
  slide.getShapes().forEach(function (sh) { sh.remove(); });

  const pageW = pres.getPageWidth();
  const pageH = pres.getPageHeight();

  slide.getBackground().setSolidFill('#FFFFFF');

  const border = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 10, 10, pageW - 20, pageH - 20);
  border.getFill().setTransparent();
  border.getBorder().getLineFill().setSolidFill('#C9A227');
  border.getBorder().setWeight(2.5);

  addCenteredText(slide, 'AUGUSTA VICTORIA HOSPITAL — THE LUTHERAN WORLD FEDERATION',
    pageW * 0.1, pageH * 0.10, pageW * 0.8, 20, 10, '#5C707A', true);
  addCenteredText(slide, 'Certificate of Completion',
    pageW * 0.1, pageH * 0.19, pageW * 0.8, 36, 22, '#0B3550', true);
  addCenteredText(slide, 'This certifies that',
    pageW * 0.1, pageH * 0.32, pageW * 0.8, 18, 11, '#5C707A', false);
  addCenteredText(slide, String(data.name),
    pageW * 0.1, pageH * 0.38, pageW * 0.8, 34, 22, '#0B3550', true);
  addCenteredText(slide,
    'has successfully completed the Facility Management & Safety (FMS) Training Program at Augusta Victoria Hospital.',
    pageW * 0.15, pageH * 0.50, pageW * 0.7, 44, 10, '#5C707A', false);

  const metaY = pageH * 0.70;
  const colW = (pageW * 0.8) / 4;
  const cols = [
    [data.department, 'DEPARTMENT'],
    [data.percent + '%', 'SCORE'],
    [data.date, 'DATE ISSUED'],
    [data.certId, 'CERTIFICATE ID']
  ];
  cols.forEach(function (c, idx) {
    const x = pageW * 0.1 + colW * idx;
    addCenteredText(slide, String(c[0]), x, metaY, colW, 18, 12, '#0B3550', true);
    addCenteredText(slide, String(c[1]), x, metaY + 20, colW, 14, 7.5, '#9AA8AE', false);
  });

  pres.saveAndClose();

  const exportUrl = 'https://docs.google.com/presentation/d/' + presId + '/export/pdf';
  const res = UrlFetchApp.fetch(exportUrl, {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }
  });
  const pdfBlob = res.getBlob().setName('AVH_FMS_Certificate_' + data.id + '_' + data.certId + '.pdf');

  const pdfFile = folder.createFile(pdfBlob);
  pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  DriveApp.getFileById(presId).setTrashed(true); // clean up the temporary Slides file

  return pdfFile.getUrl();
}

function addCenteredText(slide, text, x, y, w, h, size, color, bold) {
  const box = slide.insertTextBox(text, x, y, w, h);
  box.getText().getTextStyle().setFontSize(size).setForegroundColor(color).setBold(!!bold).setFontFamily('Arial');
  box.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  return box;
}

function getOrCreateFolder(name) {
  const it = DriveApp.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return DriveApp.createFolder(name);
}

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const action = (e.parameter.action || 'results').toLowerCase();
  const sh = ss.getSheetByName(action === 'employees' ? EMP_SHEET_NAME : RESULT_SHEET_NAME);

  let out = [];
  if (sh && sh.getLastRow() > 1) {
    const values = sh.getDataRange().getValues();
    const headers = values.shift();
    out = values.map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      return obj;
    });
  }
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sh;
}

function upsertRowByKey(sh, keyValue, rowValues) {
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(keyValue)) {
      sh.getRange(i + 1, 1, 1, rowValues.length).setValues([rowValues]);
      return;
    }
  }
  sh.appendRow(rowValues);
}
