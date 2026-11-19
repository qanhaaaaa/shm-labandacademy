# SHM Lab & Academy (Cute Dark)

Bản nâng cấp từ web SHM Lab gốc: giữ nguyên **Đo thực** và **Mô phỏng**, bổ sung:

- **Kho tàng đề thi**: 65 câu hỏi trắc nghiệm / trả lời ngắn tạo từ công thức chuẩn, bộ lọc 5 chuyên đề, 3 mức độ, chấm điểm và lưu câu sai trong trình duyệt.
- **Springy AI Tutor**: nhập đề, chọn chế độ gợi ý / giải chi tiết / kiểm tra, tải ảnh đề PNG/JPG/WEBP, kết nối API model đa phương thức nếu được cấu hình, mô phỏng tham số m & k lấy từ đề dạng chuẩn.
- **Offline tutor**: chế độ quy tắc giải bài con lắc lò xo có m,k (KHÔNG phải AI đã được fine-tune).

## Chạy ngay (không cần cài package)

1. Cài Node.js 20+.
2. Giải nén ZIP, mở Terminal / PowerShell ngay trong thư mục.
3. Chạy `node server.js` hoặc `npm start`.
4. Mở `http://localhost:4173` (trình duyệt Chrome/Edge để dùng Web Serial).

Bạn cũng có thể mở `index.html` bằng Live Server để xem 4 giao diện và luyện đề. Nhưng chức năng **AI thực sự** sẽ không hoạt động nếu chưa chạy `server.js` và chưa có API key.

## Bật Springy AI

**Windows PowerShell** (trong cùng cửa sổ đang chạy server):

```powershell
$env:OPENAI_API_KEY="your-key-here"
$env:AI_MODEL="gpt-4o-mini"
node server.js
```

**macOS / Linux:**

```bash
OPENAI_API_KEY="your-key-here" AI_MODEL="gpt-4o-mini" node server.js
```

`OPENAI_API_KEY` được lưu ở server, **không đặt vào HTML/JS frontend**. Đây là API có thể phát sinh chi phí tùy nhà cung cấp. `AI_API_BASE` có thể tùy chỉnh cho endpoint tương thích OpenAI Chat Completions, nhưng model phải hỗ trợ ảnh nếu muốn tải ảnh đề.

## Giới hạn và minh bạch khoa học

- **Chưa huấn luyện/fine-tune trọng số** mô hình trên bộ dữ liệu riêng. Springy AI được định hướng bằng kiến thức chuyên đề và ví dụ, có bộ kiểm tra công thức đơn giản. Muốn chứng minh "train riêng", cần lập bộ dữ liệu gán nhãn, huấn luyện mô hình và đánh giá trên tập kiểm thử độc lập.
- Đề trắc nghiệm trong bản demo được sinh từ các mẫu toán học cố định và được kiểm tra bằng công thức. Tăng độ phủ bằng bộ đề biên tập bởi giáo viên, không tự tuyên bố là câu hỏi từ đề thi chính thức.
- Nội dung AI có thể sai: cần đối chiếu công thức, đơn vị, dữ kiện. Bản demo không lưu đề lên cơ sở dữ liệu; khi gửi cho AI API, văn bản/ảnh được chuyển đến nhà cung cấp.
- Tính năng phát triển mới nên ghi riêng là phiên bản mở rộng sau giai đoạn nghiên cứu chính thức, không viết lại nhật ký nghiên cứu cũ.

## Cấu trúc

- `index.html`, `style.css`, `script.js`: **ba tệp gốc**, logic Đo thực/Mô phỏng được giữ.
- `academy.css`, `academy.js`: giao diện / chấm đề / học với Springy AI.
- `server.js`: web server + API proxy an toàn cơ bản, chỉ dùng local; khi deploy cần thêm authentication, rate limit bền vững, logging và quản trị chi phí.
