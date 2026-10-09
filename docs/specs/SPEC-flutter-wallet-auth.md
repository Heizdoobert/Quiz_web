# Spec: Flutter Web3 Wallet Authentication

## Objective
Tích hợp tính năng đăng nhập bằng ví Web3 vào ứng dụng di động Flutter. Sử dụng thư viện `reown_walletkit` để tạo tương tác kết nối và yêu cầu người dùng ký thông điệp (SIWE - Sign-In with Ethereum). Sau đó, gửi chữ ký này lên backend (Next.js/Supabase) để xác thực và cấp một phiên đăng nhập (session) cho ứng dụng di động.

## Tech Stack
- **Frontend (Mobile):** Flutter (Dart)
- **State Management:** Riverpod 3.0 (Notifier / ConsumerWidget)
- **Web3 Wallet Library:** `reown_walletkit` (thay thế cho WalletConnect v2)
- **Backend:** Next.js API endpoints & Supabase Auth

## Commands
- **Build APK:** `flutter build apk --release`
- **Chạy Emulator:** `flutter run`
- **Clean Project:** `flutter clean && flutter pub get`

## Project Structure
```text
mobile/lib/
  ├── features/
  │   └── auth/
  │       ├── auth_provider.dart      # Logic quản lý state đăng nhập, kết nối API
  │       ├── login_screen.dart       # Giao diện UI (đã hoàn thiện glassmorphism)
  │       └── wallet_service.dart     # Service xử lý Reown WalletKit (mới)
  ├── api/
  │   └── api_client.dart             # Giao tiếp HTTP với Next.js Backend
```

## Code Style
```dart
// Sử dụng Notifier của Riverpod 3.0, không dùng StateNotifier
class AuthNotifier extends Notifier<AuthState> {
  @override
  AuthState build() {
    return const AuthState();
  }

  Future<void> connectWallet() async {
    // Logic gọi ReownWalletKit
  }
}
```

## Testing Strategy
- **Manual Testing:** Cài đặt ứng dụng lên Emulator hoặc thiết bị thực có cài sẵn ví (MetaMask/Trust Wallet) để kiểm tra deep-linking và quá trình chuyển đổi giữa 2 app.
- **Unit Testing:** Viết test cho `wallet_service.dart` (mock việc trả về signature).

## Boundaries
- **Always do:** Xử lý các trường hợp lỗi (ví dụ: người dùng từ chối ký, lỗi timeout).
- **Ask first:** Nếu cần thay đổi endpoint hoặc cấu trúc payload API trên Next.js backend để khớp với signature từ Flutter.
- **Never do:** Không lưu trữ private key hoặc thao tác trực tiếp với on-chain transactions trong ứng dụng.

## Success Criteria
1. Nhấn nút "Connect Wallet" trên ứng dụng Flutter sẽ kích hoạt deep-link mở ứng dụng ví crypto.
2. Người dùng phê duyệt việc kết nối và ký message.
3. Ứng dụng ví tự động trả kết quả lại (hoặc người dùng quay lại) ứng dụng Flutter.
4. Chữ ký (signature) được gửi qua API Client tới backend.
5. Ứng dụng Flutter nhận được JWT token / session và chuyển hướng vào màn hình chính (`quiz_screen`).

## Open Questions
1. **WalletConnect Project ID:** Chúng ta đã có `PROJECT_ID` từ Reown/WalletConnect Cloud để khởi tạo `reown_walletkit` chưa?
2. **Backend API Endpoint:** Endpoint nào trên Next.js sẽ nhận thông điệp và chữ ký để xác thực? (Ví dụ: `POST /api/auth/verify`)
3. **App Link / Deep Link Setup:** Ứng dụng Flutter đã cấu hình Custom URL Scheme (ví dụ: `quickquiz://`) để ví có thể chuyển hướng ngược lại app sau khi ký xong chưa?
