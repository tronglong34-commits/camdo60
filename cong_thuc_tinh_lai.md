# Quy Tắc Tính Lãi Suất - Cầm Đồ 60

Tài liệu này ghi lại chi tiết công thức và các khung lãi suất đang được sử dụng tự động trong hệ thống quản lý để tính lãi tích lũy cho khách hàng.

---

## 1. Nguyên Tắc Tính Ngày
* **Số ngày đã cầm** = Ngày hôm nay (hoặc ngày tất toán) trừ đi Ngày cầm hợp đồng.
* **Nguyên tắc tính lãi tối thiểu (Lãi từ Ngày 0)**: Ngay sau khi lập hợp đồng (khi số ngày đã cầm bằng `0`), hệ thống sẽ tự động làm tròn thành `1 ngày` để áp dụng ngay mức lãi suất khung tối thiểu (khung rẻ nhất). Tránh trường hợp tất toán ngay trong ngày hoặc ngày hôm sau bị tính lãi bằng `0đ`.

---

## 2. Công Thức Tính Lãi Cho Xe Máy (Loại tài sản: `Honda`)
Lãi suất đối với Xe máy được tính theo chu kỳ **30 ngày lũy tiến** chia nhỏ làm các mốc ngày chi tiết và phân loại theo số tiền gốc cầm cố:

### Bảng biểu phí lãi suất Xe máy (Honda):

#### Khung 1: Gốc từ 1.000.000đ đến 3.000.000đ (Tính tiền lãi cố định)
* 1 - 9 ngày: **150.000đ**
* 10 - 14 ngày: **200.000đ**
* 15 - 19 ngày: **250.000đ**
* 20 - 30 ngày: **300.000đ**

#### Khung 2: Gốc từ 3.000.001đ đến 4.000.000đ (Khung 4 triệu)
* 1 - 7 ngày: **3,9%** gốc
* 8 - 14 ngày: **4,5%** gốc
* 15 - 19 ngày: **6,0%** gốc
* 20 - 30 ngày: **9,0%** gốc

#### Khung 3: Gốc từ 4.000.001đ đến 5.000.000đ (Khung 5 triệu)
* 1 - 7 ngày: **3,0%** gốc
* 8 - 14 ngày: **4,0%** gốc
* 15 - 19 ngày: **6,0%** gốc
* 20 - 30 ngày: **8,0%** gốc

#### Khung 4: Gốc từ 5.000.001đ đến 16.000.000đ (Khung 6 - 16 triệu)
* 1 - 7 ngày: **2,0%** gốc
* 8 - 9 ngày: **2,8%** gốc
* Đúng 10 ngày: **3,5%** gốc
* 11 - 14 ngày: **4,0%** gốc
* 15 - 19 ngày: **5,0%** gốc
* 20 - 30 ngày: **7,0%** gốc

#### Khung 5: Gốc từ 17.000.000đ trở lên (Khung 17 triệu trở lên)
* 1 - 7 ngày: **2,0%** gốc
* 8 - 9 ngày: **2,8%** gốc
* Đúng 10 ngày: **3,0%** gốc
* 11 - 14 ngày: **3,5%** gốc
* 15 - 19 ngày: **4,5%** gốc
* 20 - 30 ngày: **6,0%** gốc

### Thuật toán tính lãi lũy tiến (> 30 ngày):
Khi số ngày cầm vượt quá 30 ngày, hệ thống sẽ tính theo chu kỳ 30 ngày trọn vẹn (mỗi chu kỳ tính bằng lãi mốc 30 ngày của khung đó) cộng thêm lãi của số ngày lẻ dư ra tương tự như chu kỳ đầu:
* **Lãi tích lũy** = (Lãi mốc 30 ngày $\times$ `cycles`) + (Lãi của số ngày lẻ còn lại)

#### Ví dụ thực tế:
* **Ví dụ 1 (Gốc 2.000.000đ, cầm 35 ngày)**:
  * 30 ngày đầu (1 chu kỳ): **300.000đ**
  * 5 ngày lẻ dư ra (mốc 1-9 ngày): **150.000đ**
  * 👉 **Tổng lãi** = 300.000đ + 150.000đ = **450.000đ**
* **Ví dụ 2 (Gốc 10.000.000đ, cầm 42 ngày)**:
  * 30 ngày đầu (1 chu kỳ): $10.000.000 \times 7\% = 700.000đ$
  * 12 ngày lẻ dư ra (mốc 11-14 ngày): $10.000.000 \times 4\% = 400.000đ$
  * 👉 **Tổng lãi** = 700.000đ + 400.000đ = **1.100.000đ**

---

## 3. Công Thức Tính Lãi Cho Thiết Bị Khác (Điện thoại, Laptop, iPad...)
Đối với tất cả các tài sản khác không phải là Xe máy, lãi suất được tính cố định theo **chu kỳ tuần (7 ngày)**:

* **Mức lãi suất**: **2.0% / tuần** tính trên tiền gốc.
* **Số tuần tính lãi** = `Làm tròn lên của (Số ngày đã cầm / 7)`.
* **Công thức**: Lãi = Số tuần $\times$ 2.0% $\times$ Tiền gốc.
* *Lưu ý*: Vì làm tròn lên, nên bất kể số ngày lẻ nào phát sinh sang tuần mới (dù chỉ là 1 ngày) cũng sẽ được tính tròn thành 1 tuần.

#### Ví dụ thực tế (Điện thoại):
Khách cầm điện thoại **10.000.000đ** (lãi suất 2%/tuần, tương đương 200.000đ/tuần).
* **Tại ngày 0 hoặc ngày 3**: Số ngày $\le$ 7 ngày $\rightarrow$ Tính 1 tuần lãi $\rightarrow$ Lãi = 1 $\times$ 2% $\times$ 10.000.000đ = **200.000đ**.
* **Tại ngày 8**: Số ngày bước sang ngày thứ 8 (thuộc tuần thứ 2) $\rightarrow$ Tính 2 tuần lãi $\rightarrow$ Lãi = 2 $\times$ 2% $\times$ 10.000.000đ = **400.000đ**.
