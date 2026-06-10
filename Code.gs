/**
 * HỆ THỐNG QUẢN LÝ CẦM ĐỒ - GOOGLE APPS SCRIPT API (Code.gs)
 * Hướng dẫn deploy:
 * 1. Từ Google Sheets, chọn Extensions -> Apps Script.
 * 2. Thay thế toàn bộ mã trong file Code.gs bằng mã này.
 * 3. Bấm biểu tượng Lưu (Save).
 * 4. Bấm "Deploy" -> "New deployment".
 * 5. Chọn loại hình là "Web app".
 * 6. Mục "Execute as" chọn "Me (your-email@gmail.com)".
 * 7. Mục "Who has access" chọn "Anyone".
 * 8. Bấm "Deploy", cấp quyền truy cập nếu được hỏi và sao chép URL Web App nhận được.
 */

// Định nghĩa CORS response helper
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Xử lý yêu cầu GET: Lấy toàn bộ dữ liệu từ 2 tab
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Đọc Tab Danh_Sach_Cam_Do
    var sheetCamDo = ss.getSheetByName("Danh_Sach_Cam_Do");
    var contracts = [];
    if (sheetCamDo) {
      var dataCamDo = sheetCamDo.getDataRange().getValues();
      var headersCamDo = dataCamDo[0];
      for (var i = 1; i < dataCamDo.length; i++) {
        var row = dataCamDo[i];
        var contract = {};
        for (var j = 0; j < headersCamDo.length; j++) {
          var key = headersCamDo[j].toString().trim();
          var value = row[j];
          // Định dạng ngày tháng về YYYY-MM-DD
          if (value instanceof Date) {
            value = Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
          }
          contract[key] = value;
        }
        contracts.push(contract);
      }
    }
    
    // Đọc Tab Lich_Su_Dong_Lai
    var sheetLichSu = ss.getSheetByName("Lich_Su_Dong_Lai");
    var history = [];
    if (sheetLichSu) {
      var dataLichSu = sheetLichSu.getDataRange().getValues();
      var headersLichSu = dataLichSu[0];
      for (var i = 1; i < dataLichSu.length; i++) {
        var row = dataLichSu[i];
        var item = {};
        for (var j = 0; j < headersLichSu.length; j++) {
          var key = headersLichSu[j].toString().trim();
          var value = row[j];
          if (value instanceof Date) {
            value = Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
          }
          item[key] = value;
        }
        history.push(item);
      }
    }
    
    return createJsonResponse({
      success: true,
      data: {
        contracts: contracts,
        history: history
      }
    });
  } catch (error) {
    return createJsonResponse({
      success: false,
      error: error.toString()
    });
  }
}

// Xử lý yêu cầu POST: Thêm mới, cập nhật hoặc ghi lịch sử đóng lãi
function doPost(e) {
  try {
    var params = {};
    
    // Nhận dữ liệu POST dạng JSON hoặc URL encoded
    if (e.postData && e.postData.contents) {
      params = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      params = e.parameter;
    }
    
    var action = params.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === "createContract") {
      var sheetCamDo = ss.getSheetByName("Danh_Sach_Cam_Do");
      if (!sheetCamDo) {
        return createJsonResponse({ success: false, error: "Không tìm thấy Tab Danh_Sach_Cam_Do" });
      }
      
      // Tạo mã hợp đồng tự động tăng (HD0001, HD0002, ...)
      var lastRow = sheetCamDo.getLastRow();
      var newId = "HD0001";
      if (lastRow > 1) {
        var lastIdVal = sheetCamDo.getRange(lastRow, 1).getValue().toString();
        var num = parseInt(lastIdVal.replace("HD", ""), 10);
        if (!isNaN(num)) {
          newId = "HD" + String(num + 1).padStart(4, "0");
        }
      }
      
      // Xử lý lưu ảnh tài sản vào Google Drive nếu có dữ liệu gửi lên
      var imageUrl = "";
      if (params.image_data && params.image_name) {
        try {
          var contentType = params.image_data.substring(5, params.image_data.indexOf(";base64"));
          var base64Data = params.image_data.substring(params.image_data.indexOf(";base64,") + 8);
          var bytes = Utilities.base64Decode(base64Data);
          var blob = Utilities.newBlob(bytes, contentType, params.image_name);
          
          // Tìm thư mục lưu trữ: "Quản lý Cầm Đồ 60" -> "lưu hình ảnh"
          var parentFolderName = "Quản lý Cầm Đồ 60";
          var childFolderName = "lưu hình ảnh";
          var targetFolder = null;
          
          var parentFolders = DriveApp.getFoldersByName(parentFolderName);
          if (parentFolders.hasNext()) {
            var parentFolder = parentFolders.next();
            var childFolders = parentFolder.getFoldersByName(childFolderName);
            if (childFolders.hasNext()) {
              targetFolder = childFolders.next();
            } else {
              targetFolder = parentFolder.createFolder(childFolderName);
            }
          } else {
            // Nếu không tìm thấy thư mục cha, tìm thư mục con ở ngoài thư mục gốc
            var folders = DriveApp.getFoldersByName(childFolderName);
            if (folders.hasNext()) {
              targetFolder = folders.next();
            } else {
              targetFolder = DriveApp.createFolder(childFolderName);
            }
          }
          
          var file = targetFolder.createFile(blob);
          try {
            file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          } catch (err) {
            // Bỏ qua lỗi nếu chính sách tổ chức (Google Workspace) chặn chia sẻ công khai ngoài tổ chức
          }
          imageUrl = file.getUrl();
        } catch (e) {
          imageUrl = "Lỗi lưu ảnh: " + e.toString();
        }
      }
      
      var rowData = [
        newId,
        params.Ten_Khach_Hang || "",
        params.So_Dien_Thoai || "",
        params.Loai_Tai_San || "",
        params.Chi_Tiet_Tai_San || "",
        parseFloat(params.So_Tien_Cam) || 0,
        params.Ngay_Cam || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"),
        "Active", // Trạng thái mặc định là Active
        params.Ghi_Chu || "",
        imageUrl // Cột J: Hinh_Anh
      ];
      
      sheetCamDo.appendRow(rowData);
      
      return createJsonResponse({
        success: true,
        data: {
          Ma_HD: newId,
          Ten_Khach_Hang: rowData[1],
          So_Dien_Thoai: rowData[2],
          Loai_Tai_San: rowData[3],
          Chi_Tiet_Tai_San: rowData[4],
          So_Tien_Cam: rowData[5],
          Ngay_Cam: rowData[6],
          Trang_Thai: rowData[7],
          Ghi_Chu: rowData[8],
          Hinh_Anh: rowData[9]
        }
      });
      
    } else if (action === "addPayment") {
      var sheetLichSu = ss.getSheetByName("Lich_Su_Dong_Lai");
      if (!sheetLichSu) {
        return createJsonResponse({ success: false, error: "Không tìm thấy Tab Lich_Su_Dong_Lai" });
      }
      
      // Tạo mã giao dịch tự động tăng (GD0001, GD0002, ...)
      var lastRow = sheetLichSu.getLastRow();
      var newGdId = "GD0001";
      if (lastRow > 1) {
        var lastIdVal = sheetLichSu.getRange(lastRow, 1).getValue().toString();
        var num = parseInt(lastIdVal.replace("GD", ""), 10);
        if (!isNaN(num)) {
          newGdId = "GD" + String(num + 1).padStart(4, "0");
        }
      }
      
      var rowData = [
        newGdId,
        params.Ma_HD || "",
        params.Ten_Khach_Hang || "",
        params.Ngay_Dong_Lai || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"),
        parseFloat(params.So_Tien_Dong) || 0,
        params.Ghi_Chu || ""
      ];
      
      sheetLichSu.appendRow(rowData);
      
      return createJsonResponse({
        success: true,
        data: {
          Ma_Giao_Dich: newGdId,
          Ma_HD: rowData[1],
          Ten_Khach_Hang: rowData[2],
          Ngay_Dong_Lai: rowData[3],
          So_Tien_Dong: rowData[4],
          Ghi_Chu: rowData[5]
        }
      });
      
    } else if (action === "closeContract") {
      var sheetCamDo = ss.getSheetByName("Danh_Sach_Cam_Do");
      if (!sheetCamDo) {
        return createJsonResponse({ success: false, error: "Không tìm thấy Tab Danh_Sach_Cam_Do" });
      }
      
      var dataCamDo = sheetCamDo.getDataRange().getValues();
      var maHd = params.Ma_HD;
      var foundRow = -1;
      
      for (var i = 1; i < dataCamDo.length; i++) {
        if (dataCamDo[i][0].toString().trim() === maHd.toString().trim()) {
          foundRow = i + 1; // 1-indexed and header row offset
          break;
        }
      }
      
      if (foundRow === -1) {
        return createJsonResponse({ success: false, error: "Không tìm thấy hợp đồng " + maHd });
      }
      
      // Cập nhật trạng thái thành 'Closed' (Cột H là cột thứ 8)
      sheetCamDo.getRange(foundRow, 8).setValue("Closed");
      
      // Nếu có gửi thông tin số tiền đóng chuộc đồ, ta tự động ghi nhận vào lịch sử
      if (params.So_Tien_Dong && parseFloat(params.So_Tien_Dong) > 0) {
        var sheetLichSu = ss.getSheetByName("Lich_Su_Dong_Lai");
        if (sheetLichSu) {
          var lastRowLichSu = sheetLichSu.getLastRow();
          var newGdId = "GD0001";
          if (lastRowLichSu > 1) {
            var lastIdVal = sheetLichSu.getRange(lastRowLichSu, 1).getValue().toString();
            var num = parseInt(lastIdVal.replace("GD", ""), 10);
            if (!isNaN(num)) {
              newGdId = "GD" + String(num + 1).padStart(4, "0");
            }
          }
          sheetLichSu.appendRow([
            newGdId,
            maHd,
            params.Ten_Khach_Hang || dataCamDo[foundRow-1][1],
            Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"),
            parseFloat(params.So_Tien_Dong),
            "Tất toán hợp đồng (Chuộc đồ)"
          ]);
        }
      }
      
      return createJsonResponse({
        success: true,
        message: "Hợp đồng " + maHd + " đã được tất toán (Closed)."
      });
      
    } else if (action === "liquidateContract") {
      var sheetCamDo = ss.getSheetByName("Danh_Sach_Cam_Do");
      if (!sheetCamDo) {
        return createJsonResponse({ success: false, error: "Không tìm thấy Tab Danh_Sach_Cam_Do" });
      }
      
      var dataCamDo = sheetCamDo.getDataRange().getValues();
      var maHd = params.Ma_HD;
      var newStatus = params.Trang_Thai; // 'Liquidating' or 'Liquidated'
      var foundRow = -1;
      
      for (var i = 1; i < dataCamDo.length; i++) {
        if (dataCamDo[i][0].toString().trim() === maHd.toString().trim()) {
          foundRow = i + 1; // 1-indexed and header row offset
          break;
        }
      }
      
      if (foundRow === -1) {
        return createJsonResponse({ success: false, error: "Không tìm thấy hợp đồng " + maHd });
      }
      
      // Cập nhật trạng thái thành newStatus (Cột H là cột thứ 8)
      sheetCamDo.getRange(foundRow, 8).setValue(newStatus);
      
      // Nếu là Liquidated và có số tiền thu hồi, ghi nhận vào lịch sử
      if (newStatus === "Liquidated" && params.So_Tien_Dong && parseFloat(params.So_Tien_Dong) > 0) {
        var sheetLichSu = ss.getSheetByName("Lich_Su_Dong_Lai");
        if (sheetLichSu) {
          var lastRowLichSu = sheetLichSu.getLastRow();
          var newGdId = "GD0001";
          if (lastRowLichSu > 1) {
            var lastIdVal = sheetLichSu.getRange(lastRowLichSu, 1).getValue().toString();
            var num = parseInt(lastIdVal.replace("GD", ""), 10);
            if (!isNaN(num)) {
              newGdId = "GD" + String(num + 1).padStart(4, "0");
            }
          }
          sheetLichSu.appendRow([
            newGdId,
            maHd,
            params.Ten_Khach_Hang || dataCamDo[foundRow-1][1],
            Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"),
            parseFloat(params.So_Tien_Dong),
            "Thanh lý tài sản thu hồi vốn"
          ]);
        }
      }
      
      return createJsonResponse({
        success: true,
        message: "Hợp đồng " + maHd + " đã chuyển trạng thái thành " + newStatus
      });
      
    } else if (action === "uploadPDF") {
      var pdfUrl = "";
      if (params.pdf_data && params.pdf_name) {
        try {
          var contentType = "application/pdf";
          var base64Data = params.pdf_data;
          if (base64Data.indexOf(";base64,") > -1) {
            base64Data = base64Data.substring(base64Data.indexOf(";base64,") + 8);
          }
          var bytes = Utilities.base64Decode(base64Data);
          var blob = Utilities.newBlob(bytes, contentType, params.pdf_name);
          
          var pdfParentName = "Quản lý Cầm Đồ 60";
          var pdfChildName = "hóa đơn";
          var pdfFolder = null;
          
          var parentFolders = DriveApp.getFoldersByName(pdfParentName);
          if (parentFolders.hasNext()) {
            var parentFolder = parentFolders.next();
            var childFolders = parentFolder.getFoldersByName(pdfChildName);
            if (childFolders.hasNext()) {
              pdfFolder = childFolders.next();
            } else {
              pdfFolder = parentFolder.createFolder(pdfChildName);
            }
          } else {
            var folders = DriveApp.getFoldersByName(pdfChildName);
            if (folders.hasNext()) {
              pdfFolder = folders.next();
            } else {
              pdfFolder = DriveApp.createFolder(pdfChildName);
            }
          }
          
          // Xóa file cũ cùng tên nếu có để tránh trùng lặp
          var existingFiles = pdfFolder.getFilesByName(params.pdf_name);
          while (existingFiles.hasNext()) {
            var existingFile = existingFiles.next();
            existingFile.setTrashed(true);
          }
          
          var pdfFile = pdfFolder.createFile(blob);
          try {
            pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          } catch (err) {
            // Bỏ qua lỗi nếu chính sách tổ chức (Google Workspace) chặn chia sẻ công khai
          }
          pdfUrl = pdfFile.getUrl();
          
          // Ghi nhận link PDF vào cột K (cột 11) của hợp đồng trong Danh_Sach_Cam_Do
          var sheetCamDo = ss.getSheetByName("Danh_Sach_Cam_Do");
          if (sheetCamDo) {
            var dataCamDo = sheetCamDo.getDataRange().getValues();
            var maHd = params.Ma_HD;
            var foundRow = -1;
            for (var i = 1; i < dataCamDo.length; i++) {
              if (dataCamDo[i][0].toString().trim() === maHd.toString().trim()) {
                foundRow = i + 1;
                break;
              }
            }
            if (foundRow > -1) {
              sheetCamDo.getRange(foundRow, 11).setValue(pdfUrl);
            }
          }
        } catch (e) {
          return createJsonResponse({ success: false, error: e.toString() });
        }
      }
      return createJsonResponse({ success: true, url: pdfUrl });
      
    } else {
      return createJsonResponse({ success: false, error: "Hành động (action) không hợp lệ." });
    }
    
  } catch (error) {
    return createJsonResponse({
      success: false,
      error: error.toString()
    });
  }
}

// HÀM TEST ĐỂ KÍCH HOẠT CẤP QUYỀN
function testDrivePermission() {
  // Hàm này dùng để kích hoạt bảng cấp quyền truy cập Google Drive.
  // Trong giao diện Apps Script, bạn chọn hàm này ở ô chọn trên thanh công cụ và bấm nút "Run" (Chạy).
  var root = DriveApp.getRootFolder();
  Logger.log("Đã kết nối Google Drive thành công! Thư mục gốc: " + root.getName());
}
