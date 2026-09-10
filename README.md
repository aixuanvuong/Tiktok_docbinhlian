# TikTok Live Text-to-Speech (TTS) 🚀

![TikTok Live TTS](https://img.shields.io/badge/Node.js-18%2B-brightgreen)
![Express](https://img.shields.io/badge/Express-4.x-blue)
![Socket.io](https://img.shields.io/badge/Socket.IO-4.x-black)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3-cyan)
![License](https://img.shields.io/badge/License-MIT-orange)

Ứng dụng **TikTok Live Text-to-Speech (TTS)** hỗ trợ đọc tự động bình luận, lượt follow và lượt tặng quà trên các buổi livestream TikTok bằng giọng nói AI thời gian thực. Được thiết kế tối ưu riêng để chạy trên **Ubuntu Server 24/7** và nhúng vào **OBS Studio** thông qua tính năng **Browser Source** (hoặc Overlay trong suốt).

---

## 🌟 Tính Năng Nổi Bật

- **Giao Tiếp Thời Gian Thực (Real-time Socket.io)**: Kết nối trực tiếp vào luồng TikTok Live mà không cần tài khoản hay mật khẩu (chỉ cần TikTok Unique ID).
- **Hàng Đợi Âm Thanh Thông Minh (Audio Queue)**: Bắt trọn mọi bình luận/follow mà không bị phát âm thanh đè lên nhau. Chỉ phát câu tiếp theo khi câu trước đã kích hoạt sự kiện `onended`.
- **Tùy Chọn Đa Dạng Giọng Nói (TTS Engine)**:
  - **Web Speech API**: Đọc bằng giọng nói AI tích hợp sẵn của trình duyệt (Tiếng Việt ⭐, mượt mà, hoàn toàn miễn phí).
  - **Custom TTS API**: Hỗ trợ gắn URL API đọc giọng nói tùy chỉnh (Google TTS, FPT.AI, Viettel AI, v.v.).
- **Giao Diện OBS Studio Tối Ưu**:
  - Chế độ **Dark Mode** gọn gàng, trực quan.
  - Chế độ **OBS Overlay trong suốt**: Hiển thị bảng thông báo nổi sống động trực tiếp lên video livestream.
  - **Hiệu Ứng Sóng Âm Thanh (Waveform & Glowing Ring)**: Nhận biết tức thì khi AI đang đọc bình luận.
- **Bộ Lọc Sự Kiện Độc Lập**: Cho phép bật/tắt đọc riêng cho Bình luận (Chat), Lượt follow mới hoặc Tặng quà (Gift).
- **Trình Giả Lập Sự Kiện (Test Mode)**: Giúp thử nghiệm giao diện và âm thanh OBS ngay cả khi chưa mở livestream thực tế.

---

## 🏗 Kiến Trúc Hệ Thống

```text
                  ┌─────────────────────────────────────────┐
                  │          TikTok Live Stream             │
                  └────────────────────┬────────────────────┘
                                       │ (Webcast Connection)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Node.js Backend Server                         │
│  - Express Server (Port 3000 / 8080)                                    │
│  - tiktok-live-connector (Lắng nghe sự kiện Chat / Follow / Gift)       │
│  - Socket.io (Định dạng & đẩy sự kiện realtime xuống Frontend)          │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ (Socket.io Event Channel)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Frontend Dashboard / OBS Source                    │
│  - Audio Queue Manager (Hàng đợi phát âm thanh tuần tự)                │
│  - Web Speech API / Custom Fetch API                                    │
│  - Glowing Waveform Visualizer & Transparent OBS Overlay Widget         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Cấu Trúc Thư Mục Dự Án

```text
tiktok-live-tts/
├── package.json          # Danh sách thư viện và script npm
├── server.js             # Node.js Server (Express + Socket.io + TikTok Connector)
├── README.md             # Tài liệu hướng dẫn sử dụng & triển khai
└── public/
    └── index.html        # Giao diện điều khiển & Trình đọc TTS Engine
```

---

## 🛠 Hướng Dẫn Cài Đặt & Chạy Trên Máy Local

### 1. Cài đặt các thư viện phụ thuộc

```bash
# Tải/clone dự án về máy, sau đó truy cập thư mục:
cd tiktok-live-tts

# Khởi tạo và cài đặt dependencies
npm install
```

### 2. Khởi chạy ứng dụng

```bash
# Chạy ở chế độ production
npm start

# Hoặc chạy ở chế độ phát triển (Development)
npm run dev
```

Truy cập ứng dụng tại địa chỉ: `http://localhost:3000` (hoặc `http://localhost:8080`).

---

## 🚀 Hướng Dẫn Triển Khai Chi Tiết Trên Ubuntu Server (24/7)

### Bước 1: Kết nối SSH vào máy chủ Ubuntu
```bash
ssh root@<IP_SERVER_CỦA_BẠN>
```

### Bước 2: Cài đặt Node.js (Phiên bản LTS)
```bash
# Cập nhật hệ thống & cài đặt cURL
sudo apt update && sudo apt install -y curl build-essential

# Cài đặt Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Kiểm tra phiên bản
node -v
npm -v
```

### Bước 3: Đưa mã nguồn lên Ubuntu Server
```bash
# Tạo thư mục dự án
mkdir -p /var/www/tiktok-live-tts
cd /var/www/tiktok-live-tts

# Tải file dự án vào đây (hoặc git clone)
# Tiến hành cài đặt thư viện
npm install
```

### Bước 4: Mở cổng trên Tường lửa (UFW Firewall)
```bash
# Mở port 8080 (hoặc 3000)
sudo ufw allow 8080/tcp
sudo ufw reload
```

### Bước 5: Quản lý tiến trình chạy nền bằng PM2
PM2 giúp ứng dụng hoạt động 24/7 liên tục, tự động khởi động lại khi server bị reboot:

```bash
# Cài đặt PM2 toàn cục
sudo npm install -g pm2

# Khởi chạy server
pm2 start server.js --name "tiktok-tts"

# Cấu hình tự động bật PM2 khi khởi động máy chủ
pm2 startup
pm2 save
```

**Các lệnh PM2 cần nhớ**:
- `pm2 status`: Xem trạng thái ứng dụng.
- `pm2 logs tiktok-tts`: Xem nhật ký sự kiện kết nối thời gian thực.
- `pm2 restart tiktok-tts`: Khởi động lại server.

---

## 📹 Hướng Dẫn Nhúng Vào OBS Studio (Browser Source)

1. Mở phần mềm **OBS Studio** trên máy tính livestream.
2. Tại bảng **Sources (Nguồn)**, nhấn nút **`+`** -> Chọn **Browser (Trình duyệt)**.
3. Đặt tên nguồn: `TikTok Live TTS`.
4. Nhập thông số cấu hình:
   - **URL**: `http://<IP_SERVER_CỦA_BẠN>:8080` (hoặc port bạn cấu hình)
   - **Width**: `1280` (hoặc `1920`)
   - **Height**: `720` (hoặc `1080`)
5. ⚠️ **Rất quan trọng**: Tích chọn vào ô **"Control audio via OBS"** (Quản lý âm thanh thông qua OBS) để tiếng AI đọc truyền trực tiếp vào luồng âm thanh buổi Live.
6. Nhấn **OK**.
7. Trên trang điều khiển, bấm vào nút **"Chế độ OBS Overlay"** ở góc phải thanh tiêu đề để ẩn giao diện cài đặt và biến khung đọc thành bảng thông báo nổi trong suốt mượt mà trên stream!

---

## ⚙️ Cấu Hướng Dẫn Dùng Custom TTS API Key (Tùy chọn)

Nếu bạn không muốn sử dụng giọng nói trình duyệt mặc định mà muốn dùng API giọng đọc chuyên nghiệp (như Google Cloud TTS, FPT.AI, Viettel AI, ElevenLabs), chọn **Custom TTS API** trong mục cấu hình:

- **API Endpoint URL**:
  `https://api.example.com/tts?text={text}&key={key}`
- Hệ thống sẽ tự động thay thế cú pháp `{text}` bằng nội dung bình luận và `{key}` bằng API Key của bạn, sau đó tải file âm thanh về và đưa vào Audio Queue để phát tuần tự.

---

## 📝 Giấy Phép (License)

Dự án được phân phối dưới giấy phép **MIT License**. Bạn có thể tự do chỉnh sửa, chia sẻ và thương mại hóa.
