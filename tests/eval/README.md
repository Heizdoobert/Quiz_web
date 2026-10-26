# AI Evaluation Pipeline (powered by `agy` CLI)

Hệ thống kiểm thử và đánh giá tự động (Evaluation Pipeline) cho các tác vụ AI của `web_quiz`, tận dụng trực tiếp Antigravity CLI (`agy`) đã xác thực sẵn trên máy chủ, **không phụ thuộc vào API key**.

---

## Cấu trúc Thư mục

```
tests/eval/
├── datasets/
│   ├── quiz_generation.json        # Benchmark test cases cho tính năng sinh câu hỏi
│   └── moderation_safety.json      # Benchmark test cases cho kiểm duyệt & guardrails
├── schemas/
│   ├── question_schema.json        # JSON Schema bắt buộc cho câu hỏi trắc nghiệm
│   ├── judge_quiz_schema.json      # JSON Schema tiêu chí chấm điểm chất lượng câu hỏi
│   └── judge_moderation_schema.json# JSON Schema kết quả kiểm duyệt (isSafe, reason)
├── agy_client.mjs                  # Client wrapper gọi agy CLI an toàn từ Node.js
├── run_eval.mjs                    # Runner điều phối hai tầng đánh giá và xuất Scorecard
└── README.md                       # Tài liệu hướng dẫn này
```

---

## Quy trình Đánh giá 2 tầng (Two-Tier Evaluation)

1. **Tầng 1 - Deterministic Schema Validation (Node.js):**
   - Đảm bảo câu hỏi có đủ các trường: `prompt`, `options`, `correctIndex`, `explanation`.
   - Đảm bảo có chính xác 4 lựa chọn khác nhau (không trùng lặp).
   - Đảm bảo `correctIndex` là số nguyên hợp lệ trong khoảng `[0, 3]`.

2. **Tầng 2 - LLM-as-a-Judge (`agy` CLI):**
   - Đánh giá chất lượng sư phạm: Độ chính xác kiến thức, tính hợp lý của phương án gây nhiễu (distractors), độ rõ ràng của lời giải thích.
   - Đánh giá độ an toàn: Phát hiện XSS injection, Prompt Injection (Jailbreak), nội dung độc hại.
   - Xuất dữ liệu có cấu trúc 100% nhờ cờ `--json-schema` của `agy`.

---

## Hướng dẫn Chạy Đánh giá

Chạy toàn bộ pipeline:
```bash
npm run eval:agy
```

Chạy riêng module Quiz Generation:
```bash
node tests/eval/run_eval.mjs --filter=quiz
```

Chạy riêng module Content Moderation:
```bash
node tests/eval/run_eval.mjs --filter=moderation
```

---

## Báo cáo Đánh giá (Scorecard)

Kết quả sau mỗi lượt chạy được lưu tự động tại:
- `artifacts/eval_results/scorecard.json` (Dữ liệu máy đọc được, dùng cho CI/CD)
- `artifacts/eval_results/scorecard.md` (Bảng tổng hợp trực quan dạng Markdown)
