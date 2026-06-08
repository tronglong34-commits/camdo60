# Hướng dẫn cấu trúc Google Spreadsheet

Để làm cơ sở dữ liệu cho hệ thống, hãy tạo một Google Spreadsheet mới và tạo đúng 2 Tab (Sheet) với tên và các tiêu đề cột (Column Headers) chính xác như dưới đây (chú ý viết hoa chữ cái đầu và đúng chính tả).

---

## Tab 1: `Danh_Sach_Cam_Do`
Tab này dùng để lưu trữ danh sách tất cả các hợp đồng cầm đồ đã được lập.

### Các tiêu đề cột (Hàng số 1):
| Cột | Tên Tiêu Đề Cột (Headers) | Kiểu Dữ Liệu | Giải thích |
|---|---|---|---|
| A | `Ma_HD` | Chuỗi (Text) | Mã hợp đồng duy nhất (Ví dụ: HD0001, HD0002, ...) |
| B | `Ten_Khach_Hang` | Chuỗi (Text) | Họ và tên khách hàng |
| C | `So_Dien_Thoai` | Chuỗi (Text) | Số điện thoại liên lạc |
| D | `Loai_Tai_San` | Chuỗi (Text) | Honda, Điện thoại, hoặc Laptop |
| E | `Chi_Tiet_Tai_San` | Chuỗi (Text) | Biển số xe hoặc Model thiết bị |
| F | `So_Tien_Cam` | Số (Number) | Số tiền gốc cầm (VND) |
| G | `Ngay_Cam` | Ngày (Date) | Định dạng YYYY-MM-DD |
| H | `Trang_Thai` | Chuỗi (Text) | `Active` (Đang cầm) hoặc `Closed` (Đã tất toán/chuộc đồ) |
| I | `Ghi_Chu` | Chuỗi (Text) | Ghi chú thêm (nếu có) |
| J | `Hinh_Anh` | Chuỗi (Text) | Đường dẫn hình ảnh tài sản tải lên Google Drive |

---

## Tab 2: `Lich_Su_Dong_Lai`
Tab này lưu trữ lịch sử những lần đóng tiền lãi hoặc tiền chuộc đồ của khách hàng để chủ tiệm theo dõi dòng tiền thu chi.

### Các tiêu đề cột (Hàng số 1):
| Cột | Tên Tiêu Đề Cột (Headers) | Kiểu Dữ Liệu | Giải thích |
|---|---|---|---|
| A | `Ma_Giao_Dich` | Chuỗi (Text) | Mã giao dịch duy nhất (Ví dụ: GD0001, GD0002, ...) |
| B | `Ma_HD` | Chuỗi (Text) | Mã hợp đồng tương ứng trong tab Danh_Sach_Cam_Do |
| C | `Ten_Khach_Hang` | Chuỗi (Text) | Tên khách hàng đóng tiền |
| D | `Ngay_Dong_Lai` | Ngày (Date) | Định dạng YYYY-MM-DD (Ngày thực hiện giao dịch) |
| E | `So_Tien_Dong` | Số (Number) | Số tiền khách đóng thực tế (VND) |
| F | `Ghi_Chu` | Chuỗi (Text) | Loại giao dịch (Ví dụ: "Đóng lãi kì 1", "Đóng lãi & Chuộc đồ", ...) |
