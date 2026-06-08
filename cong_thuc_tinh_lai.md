# Quy Tắc Tính Lãi Suất - Cầm Đồ 60

Tài liệu này ghi lại chi tiết công thức và các khung lãi suất đang được sử dụng tự động trong hệ thống quản lý để tính lãi tích lũy cho khách hàng.

---

## 1. Nguyên Tắc Tính Ngày
* **Số ngày đã cầm** = Ngày hôm nay (hoặc ngày tất toán) trừ đi Ngày cầm hợp đồng.
* **Nguyên tắc tính lãi tối thiểu (Lãi từ Ngày 0)**: Ngay sau khi lập hợp đồng (khi số ngày đã cầm bằng `0`), hệ thống sẽ tự động làm tròn thành `1 ngày` để áp dụng ngay mức lãi suất khung tối thiểu (khung rẻ nhất). Tránh trường hợp tất toán ngay trong ngày hoặc ngày hôm sau bị tính lãi bằng `0đ`.

---

## 2. Công Thức Tính Lãi Cho Xe Máy (Loại tài sản: `Honda`)
Lãi suất đối với Xe máy được tính theo chu kỳ **30 ngày lũy tiến** chia nhỏ làm 3 mốc (10 ngày, 20 ngày, 30 ngày) và phân loại theo số tiền gốc cầm cố:

### Bảng biểu phí lãi suất Xe máy (Honda):

| Số Tiền Cầm Gốc (VND) | Lãi mốc 10 ngày đầu (`rate10`) | Lãi mốc 20 ngày đầu (`rate20`) | Lãi mốc 30 ngày đầu (`rate30`) |
| :--- | :---: | :---: | :---: |
| **Dưới hoặc bằng 3.000.000đ** | 10% gốc | 15% gốc | 20% gốc |
| **Từ 3.000.001đ đến 4.000.000đ** | 8% gốc | 12% gốc | 15% gốc |
| **Từ 4.000.001đ đến 5.000.000đ** | 4% gốc | 8% gốc | 10% gốc |
| **Từ 5.000.001đ đến 16.000.000đ** | 3% gốc | 5% gốc | 7% gốc |
| **Trên 16.000.000đ** | 2% gốc | 4% gốc | 5% gốc |

### Thuật toán tính lãi lũy tiến:
* **Nếu số ngày cầm $\le$ 30 ngày**:
  * Từ 1 đến 10 ngày: Lãi = Tiền gốc $\times$ `rate10`
  * Từ 11 đến 20 ngày: Lãi = Tiền gốc $\times$ `rate20`
  * Từ 21 đến 30 ngày: Lãi = Tiền gốc $\times$ `rate30`
* **Nếu số ngày cầm > 30 ngày**:
  * Tính số chu kỳ 30 ngày trọn vẹn: `cycles = Phần nguyên của (Số ngày / 30)`
  * Số ngày lẻ còn lại: `remainder = Số ngày % 30`
  * **Lãi tích lũy** = (Tiền gốc $\times$ `rate30` $\times$ `cycles`) + (Lãi của số ngày lẻ còn lại)
    * *Nếu ngày lẻ $\le$ 10 ngày*: Lãi cộng thêm = Tiền gốc $\times$ `rate10`
    * *Nếu ngày lẻ từ 11 đến 20 ngày*: Lãi cộng thêm = Tiền gốc $\times$ `rate20`
    * *Nếu ngày lẻ từ 21 đến 29 ngày*: Lãi cộng thêm = Tiền gốc $\times$ `rate30`

#### Ví dụ thực tế (Xe máy):
Khách cầm xe máy **4.000.000đ** (nằm trong khung từ 3 triệu đến 4 triệu: `rate10 = 8%`, `rate20 = 12%`, `rate30 = 15%`).
* **Tại ngày 0 hoặc ngày 5**: Khách cầm dưới 10 ngày $\rightarrow$ Lãi = 4.000.000đ $\times$ 8% = **320.000đ**.
* **Tại ngày 15**: Khách cầm từ 11 đến 20 ngày $\rightarrow$ Lãi = 4.000.000đ $\times$ 12% = **480.000đ**.
* **Tại ngày 35**: Khách cầm 35 ngày (1 chu kỳ 30 ngày + 5 ngày lẻ):
  * Lãi 30 ngày đầu = 4.000.000đ $\times$ 15% = 600.000đ.
  * Lãi 5 ngày lẻ (áp dụng mức 10 ngày) = 4.000.000đ $\times$ 8% = 320.000đ.
  * Tổng lãi = 600.000đ + 320.000đ = **920.000đ**.

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
