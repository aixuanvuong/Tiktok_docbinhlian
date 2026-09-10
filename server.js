import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { WebcastPushConnection } from 'tiktok-live-connector';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Cấu hình CORS để OBS Studio và các thiết bị khác dễ dàng kết nối
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Port cấu hình: Tự động nhận port 3000 từ container hoặc biến môi trường
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());
// Phục vụ các file tĩnh trong thư mục public/
app.use(express.static(path.join(__dirname, 'public')));

// Trả về file index.html khi truy cập đường dẫn
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Quản lý kết nối TikTok Live theo Socket ID
const tiktokSessions = new Map();

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client kết nối: ${socket.id}`);

  // Sự kiện kết nối phòng TikTok Live
  socket.on('connect-tiktok', async (data) => {
    const tiktokId = typeof data === 'string' ? data : data?.tiktokId;
    const cleanUsername = tiktokId ? tiktokId.trim().replace(/^@/, '') : '';

    if (!cleanUsername) {
      socket.emit('tiktok-status', {
        status: 'error',
        message: 'Vui lòng nhập TikTok Unique ID hợp lệ!'
      });
      return;
    }

    // Ngắt kết nối phiên cũ nếu đang tồn tại
    if (tiktokSessions.has(socket.id)) {
      try {
        const oldConn = tiktokSessions.get(socket.id);
        oldConn.disconnect();
      } catch (e) {
        console.error('Lỗi ngắt kết nối phiên TikTok cũ:', e);
      }
      tiktokSessions.delete(socket.id);
    }

    socket.emit('tiktok-status', {
      status: 'connecting',
      message: `Đang kết nối vào phòng Live của @${cleanUsername}...`
    });

    try {
      const liveConnection = new WebcastPushConnection(cleanUsername, {
        processInitialData: false,
        enableExtendedGiftInfo: true,
        requestOptions: {
          timeout: 10000
        },
        clientParams: {
          app_language: 'vi-VN',
          webcast_language: 'vi-VN'
        }
      });

      const state = await liveConnection.connect();
      console.log(`[TikTok] Đã kết nối phòng ${state.roomId} của @${cleanUsername}`);

      tiktokSessions.set(socket.id, liveConnection);

      socket.emit('tiktok-status', {
        status: 'connected',
        message: `Đã kết nối thành công tới phòng Live của @${cleanUsername}!`,
        roomId: state.roomId,
        username: cleanUsername
      });

      // 1. Lắng nghe sự kiện Chat (Bình luận)
      liveConnection.on('chat', (data) => {
        const nickname = data.nickname || data.uniqueId || 'Người xem';
        const comment = data.comment || '';
        const payload = {
          type: 'chat',
          id: data.msgId || `chat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          nickname,
          uniqueId: data.uniqueId,
          profilePictureUrl: data.profilePictureUrl || '',
          comment,
          formattedText: `${nickname} bình luận: ${comment}`,
          timestamp: Date.now()
        };
        socket.emit('tiktok-event', payload);
      });

      // 2. Lắng nghe sự kiện Follow (Theo dõi)
      liveConnection.on('follow', (data) => {
        const nickname = data.nickname || data.uniqueId || 'Người xem';
        const payload = {
          type: 'follow',
          id: data.msgId || `follow-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          nickname,
          uniqueId: data.uniqueId,
          profilePictureUrl: data.profilePictureUrl || '',
          formattedText: `Cảm ơn ${nickname} đã follow`,
          timestamp: Date.now()
        };
        socket.emit('tiktok-event', payload);
      });

      // 3. Lắng nghe sự kiện Gift (Tặng quà)
      liveConnection.on('gift', (data) => {
        if (data.giftType === 1 && data.repeatEnd === false) {
          // Bỏ qua tin nhắn trung gian của chuỗi combo gift
          return;
        }
        const nickname = data.nickname || data.uniqueId || 'Người xem';
        const giftName = data.giftName || 'Quà';
        const repeatCount = data.repeatCount || 1;
        const payload = {
          type: 'gift',
          id: data.msgId || `gift-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          nickname,
          uniqueId: data.uniqueId,
          giftName,
          repeatCount,
          formattedText: `Cảm ơn ${nickname} đã tặng ${repeatCount} ${giftName}`,
          timestamp: Date.now()
        };
        socket.emit('tiktok-event', payload);
      });

      // Cập nhật số lượng người xem phòng
      liveConnection.on('roomUser', (data) => {
        socket.emit('room-stats', { viewerCount: data.viewerCount });
      });

      // Sự kiện phòng Live kết thúc
      liveConnection.on('streamEnd', () => {
        socket.emit('tiktok-status', {
          status: 'disconnected',
          message: 'Phiên TikTok Live đã kết thúc.'
        });
      });

      // Lỗi kết nối TikTok
      liveConnection.on('error', (err) => {
        console.error(`[TikTok Error @${cleanUsername}]`, err);
        socket.emit('tiktok-status', {
          status: 'error',
          message: `Lỗi kết nối TikTok Live: ${err?.message || err}`
        });
      });

      // Bị ngắt kết nối
      liveConnection.on('disconnected', () => {
        socket.emit('tiktok-status', {
          status: 'disconnected',
          message: 'Đã ngắt kết nối khỏi phòng Live TikTok.'
        });
      });

    } catch (err) {
      console.error(`[TikTok Connection Error @${cleanUsername}]`, err);
      socket.emit('tiktok-status', {
        status: 'error',
        message: `Không thể kết nối tới TikTok ID "${cleanUsername}". Lỗi: ${err?.message || 'Không tìm thấy phòng Live hoặc tài khoản chưa mở Livestream!'}`
      });
    }
  });

  // Sự kiện ngắt kết nối TikTok từ phía Client
  socket.on('disconnect-tiktok', () => {
    if (tiktokSessions.has(socket.id)) {
      try {
        const liveConn = tiktokSessions.get(socket.id);
        liveConn.disconnect();
      } catch (e) {}
      tiktokSessions.delete(socket.id);
    }
    socket.emit('tiktok-status', {
      status: 'disconnected',
      message: 'Đã ngắt kết nối TikTok.'
    });
  });

  // Sự kiện giả lập (Giúp thử nghiệm âm thanh và OBS khi không có livestream thực tế)
  socket.on('simulate-event', (data) => {
    const { type, nickname, text } = data || {};
    const name = nickname || 'Minh Anh';

    if (type === 'chat') {
      const commentText = text || 'Chào mọi người, chúc buổi livestream vui vẻ!';
      socket.emit('tiktok-event', {
        type: 'chat',
        id: `sim-${Date.now()}`,
        nickname: name,
        comment: commentText,
        formattedText: `${name} bình luận: ${commentText}`,
        timestamp: Date.now()
      });
    } else if (type === 'follow') {
      socket.emit('tiktok-event', {
        type: 'follow',
        id: `sim-${Date.now()}`,
        nickname: name,
        formattedText: `Cảm ơn ${name} đã follow`,
        timestamp: Date.now()
      });
    } else if (type === 'gift') {
      const gift = text || 'Bông hoa';
      socket.emit('tiktok-event', {
        type: 'gift',
        id: `sim-${Date.now()}`,
        nickname: name,
        giftName: gift,
        repeatCount: 1,
        formattedText: `Cảm ơn ${name} đã tặng 1 ${gift}`,
        timestamp: Date.now()
      });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client ngắt kết nối: ${socket.id}`);
    if (tiktokSessions.has(socket.id)) {
      try {
        const liveConn = tiktokSessions.get(socket.id);
        liveConn.disconnect();
      } catch (e) {}
      tiktokSessions.delete(socket.id);
    }
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`===================================================`);
  console.log(`🚀 TikTok Live TTS Server đang chạy trên port ${PORT}`);
  console.log(`📡 URL truy cập: http://localhost:${PORT}`);
  console.log(`===================================================`);
});
