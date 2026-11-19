# SHM Lab & Academy — Vercel Ready (2.1)

## Deploy lên Vercel

1. Thay toàn bộ 8 file trong repository cũ bằng nội dung của gói này (xem hướng dẫn cập nhật GitHub).
2. Project Vercel → Settings → Build and Deployment: Framework = Other, Output Directory = `public` (không dùng `.`), Root Directory = `./`. `vercel.json` cũng khai báo outputDirectory `public`.
3. Push commit lên nhánh main, sau đó truy cập URL .vercel.app.
4. Kiểm tra `/` hiển thị trang SHM Lab. Trang AI khi chưa có API key chỉ có chế độ offline hạn chế.
5. Thêm `OPENAI_API_KEY` vào Environment Variables của Vercel, redeploy. Có thể thiết lập `AI_MODEL` để đổi model. Tuyệt đối không commit API key.

## Cấu trúc
- public/: HTML, CSS và JS chạy trên trình duyệt
- api/tutor.js: serverless handler POST /api/tutor; gửi yêu cầu OpenAI từ server
- local/server.js: tùy chọn chạy offline bằng `npm start` (Node.js >=20)
- vercel.json: cấu hình Vercel xuất thư mục `public`

## Thử API
- Không có OPENAI_API_KEY: POST /api/tutor trả 503, web tự chuyển sang bộ giải offline (không phải AI).
- Có OPENAI_API_KEY: serverless function gọi AI và trả `answer`, `simulation`.

## Giới hạn & bảo mật
- Bộ đếm rate limit hiện có chạy trong bộ nhớ process, không bảo vệ đáng tin cậy giữa nhiều serverless instances. Trước khi công khai rộng rãi nên bổ sung kiểm soát truy cập, giới hạn sử dụng trên storage tập trung và ngân sách/quota API.
- Cần kiểm tra thực tế Web Serial với ESP32 trên Chrome/Edge + HTTPS.
- Cần xác minh việc deploy, gọi API bằng key thật và thao tác frontend trên domain mới.
