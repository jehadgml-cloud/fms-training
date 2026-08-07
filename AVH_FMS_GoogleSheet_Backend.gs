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
 * -----------------------------------------------------------
 */

const EMP_SHEET_NAME = 'Employees';
const RESULT_SHEET_NAME = 'Results';

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
         'Status', 'Date', 'Certificate ID', 'Answers JSON']);
      sh.appendRow([
        body.data.id, body.data.name, body.data.department,
        body.data.score, body.data.total, body.data.percent,
        body.data.passed ? 'Pass' : 'Fail', body.data.date,
        body.data.certId || '', JSON.stringify(body.data.answers || [])
      ]);
    }

    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
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
