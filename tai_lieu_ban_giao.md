# TÀI LIỆU BÀN GIAO VÀ HƯỚNG DẪN SỬ DỤNG
## HỆ THỐNG QUẢN LÝ TIỆM CẦM ĐỒ 60

Tài liệu này cung cấp toàn bộ thông tin tài khoản quản trị, cấu trúc hệ thống, hướng dẫn sử dụng và vận hành kỹ thuật cho khách hàng bàn giao.

---

## 1. TỔNG QUAN HỆ THỐNG & TÀI KHOẢN QUẢN TRỊ

Hệ thống được thiết kế dạng Web App hiện đại, chạy mượt mà trên cả máy tính (Desktop) và điện thoại di động (Mobile).

### Thông tin tài khoản dịch vụ
Tất cả các nền tảng dịch vụ vận hành hệ thống đều được đăng ký và quản lý tập trung thông qua email:
* **Email chủ sở hữu:** `Tronglong34@gmail.com`
* **Các dịch vụ sử dụng email này bao gồm:**
  1. **GitHub** (Lưu trữ mã nguồn/code)
  2. **Supabase** (Cơ sở dữ liệu đám mây & Lưu trữ tệp ảnh)
  3. **Vercel** (Hosting chạy trang web trực tuyến)

### Thông tin đăng nhập quản trị trang web (Admin)
* **Tài khoản mặc định:** `camdo86`
* **Mật khẩu mặc định:** `Tiemcamdo86@123`
*(Lưu ý: Bạn có thể đổi tài khoản và mật khẩu đăng nhập này trực tiếp từ phần **Cài Đặt** trên giao diện web)*

---

## 2. KIẾN TRÚC KỸ THUẬT (Dành cho Kỹ thuật viên)

Hệ thống được xây dựng trên mô hình Serverless nhẹ nhàng, bảo mật và tốc độ cao:
* **Giao diện (Frontend):** HTML5, CSS3 và Vanilla Javascript. Sử dụng Tailwind CSS CDN để tạo giao diện responsive đẹp mắt, mượt mà và tối ưu trên mọi kích thước màn hình.
* **Cơ sở dữ liệu (Database):** **Supabase PostgreSQL**. Toàn bộ dữ liệu hợp đồng và lịch sử giao dịch được đồng bộ thời gian thực.
* **Lưu trữ đám mây (Storage Buckets):**
  * `pawnshop-public` (Công khai): Dành cho ảnh chụp tài sản cầm cố và file PDF hóa đơn.
  * `pawnshop-private` (Riêng tư - Bảo mật cao): Lưu trữ ảnh chụp CCCD mặt trước/sau của khách hàng. Liên kết xem ảnh CCCD là liên kết bảo mật tạm thời (Signed URL) tự động hết hạn sau **120 giây** để tránh lộ lọt thông tin cá nhân.
* **Tự động triển khai (CI/CD):** Đồng bộ trực tiếp giữa kho chứa mã nguồn GitHub và dịch vụ Hosting Vercel. Mỗi lần đẩy code mới lên nhánh `main` của GitHub, website trên Vercel sẽ tự động cập nhật trong 1-2 phút.

---

## 3. HƯỚNG DẪN VẬN HÀNH CHO CHỦ CỬA HÀNG

### 3.1. Đăng nhập và Thiết lập ban đầu
1. Truy cập đường link trang web do Vercel cấp.
2. Nhập tài khoản: `camdo86` và mật khẩu: `Tiemcamdo86@123` để đăng nhập.
3. **Nút Làm Mới (Header):** Khi sử dụng song song trên nhiều thiết bị (hoặc khi mạng chập chờn), nhấn nút **Làm Mới** ở trên header để đồng bộ và cập nhật dữ liệu mới nhất từ máy chủ Supabase.

### 3.2. Lập hợp đồng cầm đồ mới
1. Điền các thông tin khách hàng bắt buộc (Tên, Số điện thoại).
2. Nhập số CCCD (nếu có).
3. Chọn Loại tài sản và nhập chi tiết tài sản (Biển số xe, dòng máy...).
4. Nhập Số tiền cầm (hệ thống tự động định dạng dấu phẩy phân tách hàng nghìn) và chọn Ngày cầm.
5. Chụp ảnh/Tải lên ảnh tài sản, ảnh CCCD mặt trước và mặt sau.
6. Nhấn nút **Lưu & Xuất Hóa Đơn (PDF)**.
   * Hệ thống sẽ tự động chèn ảnh CCCD vào cuối hóa đơn, tạo hóa đơn chuẩn khổ **A5**, tải file PDF hóa đơn lên Supabase Storage và lưu thông tin hợp đồng vào Database.
   * Bản xem trước hóa đơn hiển thị trực tiếp ở bên phải màn hình để kiểm tra trước khi in.

### 3.3. Quản lý hợp đồng đang hoạt động (Đang Cầm)
* Hệ thống hiển thị trực quan các thẻ hợp đồng với các màu sắc trạng thái rõ ràng.
* **Tính lãi suất tự động:** Mỗi hợp đồng sẽ tự động tính toán số ngày đã cầm và số tiền lãi tích lũy theo thời gian thực dựa trên ngày lập hợp đồng.
* Nhấn vào thẻ hợp đồng để xem **Chi Tiết Hợp Đồng**:
  * **Đóng Lãi:** Ghi nhận số tiền đóng lãi của khách hàng và lưu lại lịch sử chi tiết (ngày đóng, số tiền, ghi chú).
  * **Chuộc Đồ (Tất toán):** Thanh lý hợp đồng, chuyển trạng thái về `Closed`.
  * **Thanh Lý:** Chuyển trạng thái sang `Liquidating` (Chờ thanh lý) hoặc `Liquidated` (Đã thanh lý thu hồi vốn).
  * **Sửa HĐ:** Chỉnh sửa các thông tin cơ bản của hợp đồng.
  * **Xóa HĐ (Nút màu đỏ):** Xóa vĩnh viễn hợp đồng khỏi database và dọn sạch các tệp ảnh tài sản, ảnh CCCD, file PDF hóa đơn liên quan trên Cloud Storage để bảo vệ dữ liệu khách hàng.

### 3.4. Lịch sử đóng lãi & Thống kê doanh thu
* **Lịch sử đóng lãi:** Nơi theo dõi tất cả dòng tiền thu lãi từ trước đến nay. Bạn cũng có thể nhấn **Nhập Thu Ngoài** để ghi nhận các khoản thu nhập khác ngoài cầm đồ (như mua bán xe cũ, thanh lý tài sản...).
* **Bảng thống kê:** Tổng hợp chi tiết dòng tiền gồm: tổng vốn đang cầm, tổng số lãi thực nhận trong tuần/tháng, số lượng hợp đồng thêm mới/tất toán, vốn thu hồi và cơ cấu tài sản đang cầm giữ.

---

## 4. QUẢN TRỊ KỸ THUẬT VÀ BẢO TRÌ

### 4.1. Đổi thông tin kết nối Supabase / Google Sheets
Nếu sau này bạn muốn đổi sang một tài khoản database Supabase khác hoặc kết nối lại Google Sheets cũ:
1. Nhấn nút **Cài Đặt** (hình bánh răng cưa) trên header hoặc menu di động.
2. Cập nhật **Supabase URL**, **Supabase Anon Key** mới hoặc đường dẫn **Google Web App URL (Legacy)**.
3. Nhấn **Lưu Cấu Hình**.

### 4.2. Thay đổi thông tin đăng nhập Admin
1. Mở cửa sổ **Cài Đặt** (Răng cưa).
2. Tại phần **Đổi Tài Khoản Đăng Nhập Admin**, nhập Tên đăng nhập mới và Mật khẩu mới.
3. Bấm **Cập Nhật Tài Khoản**. Thông tin sẽ được lưu trực tiếp vào bảng `config` trên cơ sở dữ liệu Supabase.

### 4.3. Quản lý dữ liệu trực tiếp trên Supabase
Bạn có thể truy cập bảng điều khiển Supabase bằng tài khoản email `Tronglong34@gmail.com` để xem và chỉnh sửa dữ liệu gốc:
* Bảng **`contracts`**: Chứa toàn bộ thông tin hợp đồng cầm đồ.
* Bảng **`history`**: Chứa lịch sử các đợt đóng lãi, chuộc đồ, thu ngoài.
* Bảng **`config`**: Chứa thông tin tài khoản đăng nhập admin (dòng `username` và `password`).
* Mục **Storage**:
  * Bucket `pawnshop-public`: Lưu tệp ảnh tài sản và tệp PDF hóa đơn.
  * Bucket `pawnshop-private`: Lưu tệp ảnh chụp CCCD.
