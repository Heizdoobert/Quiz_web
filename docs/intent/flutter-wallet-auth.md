# Intent: Flutter Web3 Wallet Authentication

## 1. Outcome
Tích hợp tính năng đăng nhập ví Web3 vào ứng dụng Flutter bằng thư viện `reown_walletkit` và đồng bộ phiên đăng nhập (session) với Supabase.

## 2. User
Người dùng ứng dụng di động muốn đăng nhập bằng ví crypto cá nhân của họ (MetaMask, Trust Wallet, v.v.).

## 3. Why Now
Giao diện UI của ứng dụng di động đã hoàn thiện. Việc xác thực người dùng là mảnh ghép logic tiếp theo cần thiết để cho phép người dùng bắt đầu chơi và lưu lại tiến trình.

## 4. Success
Tương tác deep-link trơn tru giữa ứng dụng Quiz và ứng dụng ví crypto. Người dùng có thể nhấn "Connect Wallet", chuyển sang ứng dụng ví để ký xác nhận thông điệp (sign message), và quay trở lại ứng dụng Flutter với một phiên đăng nhập (session) hợp lệ được cung cấp từ backend.

## 5. Constraint
Phải xử lý tốt việc chuyển đổi ứng dụng (deep-linking) trên nền tảng di động (iOS/Android) và tích hợp liền mạch với luồng xác thực API hiện có của Next.js/Supabase backend.

## 6. Out of Scope
Không xử lý các giao dịch trên chuỗi (on-chain transactions), chuyển token, hay tương tác với smart contract trong giai đoạn này. Chỉ tập trung duy nhất vào luồng đăng nhập xác thực (authentication).
