# 🎮 Nối Từ - Vietnamese Word Chain Game

Game nối từ tiếng Việt multiplayer real-time.

## Cài đặt & Chạy

### 1. Server
```bash
cd server
npm install
npm run dev
```
Server chạy tại `http://localhost:3001`

### 2. Client
```bash
cd client
npm install
npm run dev
```
Client chạy tại `http://localhost:5173`

### 3. Chơi
1. Mở `http://localhost:5173` trên 2+ trình duyệt/tab
2. Người 1: Nhập tên → "Tạo phòng" → Copy mã phòng
3. Người 2: Nhập tên + mã phòng → "Tham gia"
4. Host nhấn "Bắt đầu Game"

## Tech Stack
- **Frontend**: React 18 + Vite + TailwindCSS
- **Backend**: Node.js + Express + Socket.io
- **Validation**: Local dictionary + Player voting (không cần API)
- **Sound**: Web Audio API

## Cách chơi
- Nối từ: từ cuối = từ đầu cụm tiếp theo
- VD: "con mèo" → "mèo cái" → "cái bàn"
- Mỗi vòng có 1 chủ đề (Thực phẩm, Động vật, etc.)
- 10 giây mỗi lượt
- Sai hoặc hết giờ → bị loại!
