/**
 * Pharmacy Manager Talk (약국 실장톡) - Apps Script Logic
 */

// 1. Spreadsheet Initialization
function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Requests Sheet
  let requestSheet = ss.getSheetByName('Requests');
  if (!requestSheet) {
    requestSheet = ss.insertSheet('Requests');
    requestSheet.appendRow(['ID', 'Timestamp', 'User', 'Content', 'Status', 'Deleted']);
    requestSheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#f0f0f0');
  }
  
  // Comments Sheet
  let commentSheet = ss.getSheetByName('Comments');
  if (!commentSheet) {
    commentSheet = ss.insertSheet('Comments');
    commentSheet.appendRow(['RequestID', 'Timestamp', 'User', 'Comment']);
    commentSheet.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#f0f0f0');
  }
}

// 2. Serve Web Page
function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('약국 실장톡')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// 3. Save New Request & Send Notification
function saveRequest(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const requestSheet = ss.getSheetByName('Requests');
  const id = 'REQ_' + new Date().getTime();
  const timestamp = new Date();
  
  requestSheet.appendRow([
    id, 
    timestamp, 
    data.user || 'Unknown', 
    data.content, 
    'Active', 
    'N'
  ]);
  
  // Send Phone Notification
  sendTelegramNotification(`📢 새로운 요청이 도착했습니다!\n👤 작성자: ${data.user}\n📝 내용: ${data.content}`);
  
  return { status: 'success', id: id };
}

// 4. Get All Requests & Comments
function getRequests() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let requestSheet = ss.getSheetByName('Requests');
    let commentSheet = ss.getSheetByName('Comments');
    
    // Auto-setup if sheets are missing
    if (!requestSheet || !commentSheet) {
      setupSheet();
      requestSheet = ss.getSheetByName('Requests');
      commentSheet = ss.getSheetByName('Comments');
    }
    
    const requestData = requestSheet.getDataRange().getValues();
    const requests = requestData.length > 1 ? requestData.slice(1)
      .filter(row => row[5] === 'N')
      .map(row => ({
        id: row[0],
        timestamp: row[1] instanceof Date ? row[1].toISOString() : row[1],
        user: row[2],
        content: row[3],
        status: row[4]
      }))
      .reverse() : [];
      
    const commentData = commentSheet.getDataRange().getValues();
    const comments = commentData.length > 1 ? commentData.slice(1)
      .map(row => ({
        requestId: row[0],
        timestamp: row[1] instanceof Date ? row[1].toISOString() : row[1],
        user: row[2],
        comment: row[3]
      })) : [];
      
    return { requests: requests, comments: comments };
  } catch (e) {
    Logger.log('Error in getRequests: ' + e.message);
    return { requests: [], comments: [] };
  }
}

// 5. Update Status (Complete/Delete)
function updateRequestStatus(id, action) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Requests');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      if (action === 'complete') {
        sheet.getRange(i + 1, 5).setValue('Complete');
      } else if (action === 'delete') {
        sheet.getRange(i + 1, 6).setValue('Y');
      }
      break;
    }
  }
}

// 6. Save Comment
function saveComment(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Comments');
  sheet.appendRow([
    data.requestId,
    new Date(),
    data.user || 'Unknown',
    data.comment
  ]);
  
  return { status: 'success' };
}

// 7. Notification Utility (Telegram Bot Example)
function sendTelegramNotification(text) {
  const token = '8768041342:AAH0xNgULH_470lFH2v7VYJcm5J-cHAozg4'; 
  const chatId = '8635739681';   
  
  if (!token || token === 'YOUR_BOT_TOKEN') return; 
  
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const payload = {
    method: 'post',
    payload: {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    }
  };
  
  try {
    UrlFetchApp.fetch(url, payload);
  } catch (e) {
    Logger.log('Notification failed: ' + e.message);
  }
}
