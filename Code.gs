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

// Lấy thông tin tài khoản và mật khẩu từ tab Cau_Hinh
function getStoredCredentials(ss) {
  var creds = {
    username: "camdo86",
    password: "Tiemcamdo86@123"
  };
  try {
    var sheetConfig = ss.getSheetByName("Cau_Hinh");
    if (sheetConfig) {
      var data = sheetConfig.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        var key = data[i][0].toString().trim().toLowerCase();
        var val = data[i][1].toString().trim();
        if (key === "username") creds.username = val;
        if (key === "password") creds.password = val;
      }
    }
  } catch (err) {}
  return creds;
}

// Xử lý yêu cầu GET: Lấy toàn bộ dữ liệu từ 2 tab (Hỗ trợ CacheService phản hồi siêu nhanh)
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var creds = getStoredCredentials(ss);
    
    // Kiểm tra mật khẩu truy cập dữ liệu
    var requestPass = (e && e.parameter && e.parameter.password) ? e.parameter.password.toString().trim() : "";
    if (requestPass !== creds.password) {
      return createJsonResponse({
        success: false,
        error: "Unauthorized: Sai hoặc thiếu mật khẩu truy cập dữ liệu."
      });
    }

    var cache = CacheService.getScriptCache();
    
    // Nếu có tham số clean=true, ép buộc xóa cache cũ để lấy dữ liệu mới nhất
    if (e && e.parameter && e.parameter.clean === "true") {
      try {
        cache.remove("pawnshop_data");
      } catch (cacheErr) {}
    }
    
    var cachedData = cache.get("pawnshop_data");
    
    // Nếu có dữ liệu trong Cache, trả về ngay lập tức
    if (cachedData) {
      return ContentService.createTextOutput(cachedData)
        .setMimeType(ContentService.MimeType.JSON);
    }
    
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
    
    var responseObj = {
      success: true,
      data: {
        contracts: contracts,
        history: history
      }
    };
    
    var responseString = JSON.stringify(responseObj);
    
    // Lưu kết quả vào Cache trong 6 giờ (21600 giây - tối đa của CacheService là 6 giờ)
    try {
      cache.put("pawnshop_data", responseString, 21600);
    } catch (cacheErr) {
      // Bỏ qua nếu kích thước chuỗi vượt quá giới hạn cache của Apps Script (100KB)
    }
    
    return ContentService.createTextOutput(responseString)
      .setMimeType(ContentService.MimeType.JSON);
      
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
    // Xóa cache cũ ngay khi có bất kỳ thao tác ghi nào để đảm bảo tính đồng bộ dữ liệu mới nhất
    try {
      CacheService.getScriptCache().remove("pawnshop_data");
    } catch (cacheErr) {}

    var params = {};
    
    // Nhận dữ liệu POST dạng JSON hoặc URL encoded
    if (e.postData && e.postData.contents) {
      params = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      params = e.parameter;
    }
    
    var action = params.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var creds = getStoredCredentials(ss);
    
    // Nếu là hành động đăng nhập
    if (action === "login") {
      var requestUser = params.username ? params.username.toString().trim() : "";
      var requestPass = params.password ? params.password.toString().trim() : "";
      var success = (requestUser === creds.username && requestPass === creds.password);
      return createJsonResponse({
        success: success,
        message: success ? "Đăng nhập thành công!" : "Sai tài khoản hoặc mật khẩu!"
      });
    }
    
    // Đối với tất cả các hành động ghi dữ liệu khác, kiểm tra mật khẩu
    var requestPass = params.password ? params.password.toString().trim() : "";
    if (requestPass !== creds.password) {
      return createJsonResponse({
        success: false,
        error: "Unauthorized: Mật khẩu xác thực ghi dữ liệu không đúng."
      });
    }
    
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
      var imageUrl = saveBase64ToDrive(params.image_data, params.image_name);
      
      // Xử lý lưu ảnh CCCD mặt trước vào Google Drive nếu có
      var cccdFrontImageUrl = saveBase64ToDrive(params.cccd_front_image_data, params.cccd_front_image_name);
      
      // Xử lý lưu ảnh CCCD mặt sau vào Google Drive nếu có
      var cccdBackImageUrl = saveBase64ToDrive(params.cccd_back_image_data, params.cccd_back_image_name);
      
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
        imageUrl, // Cột J: Hinh_Anh
        "",       // Cột K: PDF_Url (để trống ban đầu)
        params.So_CCCD || "", // Cột L: So_CCCD
        cccdFrontImageUrl, // Cột M: Hinh_CCCD_Truoc
        cccdBackImageUrl // Cột N: Hinh_CCCD_Sau
      ];
      
      sheetCamDo.appendRow(rowData);
      
      return createJsonResponse({
        success: true,
        data: {
          Ma_HD: newId,
          Ten_Khach_Hang: rowData[1],
          So_Dien_Thoai: rowData[2],
          So_CCCD: rowData[11],
          Loai_Tai_San: rowData[3],
          Chi_Tiet_Tai_San: rowData[4],
          So_Tien_Cam: rowData[5],
          Ngay_Cam: rowData[6],
          Trang_Thai: rowData[7],
          Ghi_Chu: rowData[8],
          Hinh_Anh: rowData[9],
          Hinh_CCCD_Truoc: rowData[12],
          Hinh_CCCD_Sau: rowData[13]
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
      
    } else if (action === "editContract") {
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
      
      // Batch write columns 1 to 14 (A to N)
      var range = sheetCamDo.getRange(foundRow, 1, 1, 14);
      var values = range.getValues()[0];
      
      if (params.Ten_Khach_Hang !== undefined) values[1] = params.Ten_Khach_Hang;
      if (params.So_Dien_Thoai !== undefined) values[2] = params.So_Dien_Thoai;
      if (params.Loai_Tai_San !== undefined) values[3] = params.Loai_Tai_San;
      if (params.Chi_Tiet_Tai_San !== undefined) values[4] = params.Chi_Tiet_Tai_San;
      if (params.So_Tien_Cam !== undefined) values[5] = parseFloat(params.So_Tien_Cam) || 0;
      if (params.Ngay_Cam !== undefined) values[6] = params.Ngay_Cam;
      if (params.Ghi_Chu !== undefined) values[8] = params.Ghi_Chu || "";
      if (params.So_CCCD !== undefined) values[11] = params.So_CCCD || "";
      
      // Update image links if they were changed
      if (params.image_data !== undefined) {
        if (params.image_data === "") {
          values[9] = ""; // Xóa hình
        } else if (params.image_data.indexOf("http") !== 0) {
          values[9] = saveBase64ToDrive(params.image_data, params.image_name || (maHd + "_asset.jpg"));
        }
      }
      
      if (params.cccd_front_image_data !== undefined) {
        if (params.cccd_front_image_data === "") {
          values[12] = ""; // Xóa cccd trước
        } else if (params.cccd_front_image_data.indexOf("http") !== 0) {
          values[12] = saveBase64ToDrive(params.cccd_front_image_data, params.cccd_front_image_name || (maHd + "_cccd_front.jpg"));
        }
      }
      
      if (params.cccd_back_image_data !== undefined) {
        if (params.cccd_back_image_data === "") {
          values[13] = ""; // Xóa cccd sau
        } else if (params.cccd_back_image_data.indexOf("http") !== 0) {
          values[13] = saveBase64ToDrive(params.cccd_back_image_data, params.cccd_back_image_name || (maHd + "_cccd_back.jpg"));
        }
      }
      
      range.setValues([values]);
      
      // Định dạng lại ngày để gửi về frontend
      var formattedDate = values[6];
      if (formattedDate instanceof Date) {
        formattedDate = Utilities.formatDate(formattedDate, Session.getScriptTimeZone(), "yyyy-MM-dd");
      }
      
      return createJsonResponse({
        success: true,
        message: "Hợp đồng " + maHd + " đã được cập nhật thành công.",
        data: {
          Ma_HD: values[0],
          Ten_Khach_Hang: values[1],
          So_Dien_Thoai: values[2],
          Loai_Tai_San: values[3],
          Chi_Tiet_Tai_San: values[4],
          So_Tien_Cam: values[5],
          Ngay_Cam: formattedDate,
          Trang_Thai: values[7],
          Ghi_Chu: values[8],
          Hinh_Anh: values[9],
          PDF_Url: values[10],
          So_CCCD: values[11],
          Hinh_CCCD_Truoc: values[12],
          Hinh_CCCD_Sau: values[13]
        }
      });
      
    } else if (action === "updateImages") {
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
      
      // Save images to Google Drive
      var imageUrl = params.image_data ? saveBase64ToDrive(params.image_data, params.image_name) : "";
      var cccdFrontImageUrl = params.cccd_front_image_data ? saveBase64ToDrive(params.cccd_front_image_data, params.cccd_front_image_name) : "";
      var cccdBackImageUrl = params.cccd_back_image_data ? saveBase64ToDrive(params.cccd_back_image_data, params.cccd_back_image_name) : "";
      
      // Optimize: Batch write columns J, K, L, M, N (columns 10 to 14)
      // J (10): Hinh_Anh
      // K (11): PDF_Url
      // L (12): So_CCCD
      // M (13): Hinh_CCCD_Truoc
      // N (14): Hinh_CCCD_Sau
      var range = sheetCamDo.getRange(foundRow, 10, 1, 5); // Columns 10 to 14
      var values = range.getValues()[0];
      if (imageUrl) values[0] = imageUrl;
      if (cccdFrontImageUrl) values[3] = cccdFrontImageUrl;
      if (cccdBackImageUrl) values[4] = cccdBackImageUrl;
      range.setValues([values]);
      
      return createJsonResponse({
        success: true,
        data: {
          Hinh_Anh: imageUrl || undefined,
          Hinh_CCCD_Truoc: cccdFrontImageUrl || undefined,
          Hinh_CCCD_Sau: cccdBackImageUrl || undefined
        }
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
          
          var parentFolder = getOrCreateFolder("Quản lý Cầm Đồ 60", "PARENT_FOLDER_ID");
          var pdfFolder = getOrCreateFolder("hóa đơn", "PDF_FOLDER_ID", parentFolder.getId());
          
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

function saveBase64ToDrive(base64Data, fileName) {
  if (!base64Data || !fileName) return "";
  try {
    var contentType = base64Data.substring(5, base64Data.indexOf(";base64"));
    var base64DataClean = base64Data.substring(base64Data.indexOf(";base64,") + 8);
    var bytes = Utilities.base64Decode(base64DataClean);
    var blob = Utilities.newBlob(bytes, contentType, fileName);
    
    var parentFolder = getOrCreateFolder("Quản lý Cầm Đồ 60", "PARENT_FOLDER_ID");
    var targetFolder = getOrCreateFolder("lưu hình ảnh", "IMAGE_FOLDER_ID", parentFolder.getId());
    
    var file = targetFolder.createFile(blob);
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (err) {
      // Bỏ qua lỗi chia sẻ ngoài tổ chức
    }
    return file.getUrl();
  } catch (e) {
    return "Lỗi lưu ảnh: " + e.toString();
  }
}

// HÀM TEST ĐỂ KÍCH HOẠT CẤP QUYỀN
function testDrivePermission() {
  // Hàm này dùng để kích hoạt bảng cấp quyền truy cập Google Drive.
  // Trong giao diện Apps Script, bạn chọn hàm này ở ô chọn trên thanh công cụ và bấm nút "Run" (Chạy).
  var root = DriveApp.getRootFolder();
  Logger.log("Đã kết nối Google Drive thành công! Thư mục gốc: " + root.getName());
}

// HÀM TIỆN ÍCH: Lấy hoặc tạo thư mục trên Drive hỗ trợ Cache ID để tối ưu tốc độ
function getOrCreateFolder(folderName, propertyKey, parentFolderId) {
  var props = PropertiesService.getScriptProperties();
  var folderId = props.getProperty(propertyKey);
  
  if (folderId) {
    try {
      return DriveApp.getFolderById(folderId);
    } catch (e) {
      // Bỏ qua lỗi và tiếp tục tìm lại nếu thư mục bị xóa
    }
  }
  
  var folder;
  var parent = parentFolderId ? DriveApp.getFolderById(parentFolderId) : DriveApp;
  var folders = parent.getFoldersByName(folderName);
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = parent.createFolder(folderName);
  }
  
  props.setProperty(propertyKey, folder.getId());
  return folder;
}

// TỰ ĐỘNG XÓA CACHE KHI CÓ CHỈNH SỬA TRỰC TIẾP TRÊN GOOGLE SHEETS
function onEdit(e) {
  try {
    CacheService.getScriptCache().remove("pawnshop_data");
  } catch (err) {}
}

function onChange(e) {
  try {
    CacheService.getScriptCache().remove("pawnshop_data");
  } catch (err) {}
}
