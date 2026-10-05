# docs/specs/SPEC-auth-popup.md
lines:234 exports:default
---
# Spec: auth-popup

**Module ID:** `auth-popup`
**Capability Map:** `auth-popup` → `user-features` → `ecosystem-v2` → `perf-arch`

## Mục tiêu (Objective)

Thay thế hoàn toàn `SignInModal` cũ (292 dòng, 1 file) bằng popup Auth mới với **2 bước rõ ràng**:

1. **Bước 1 — Chọn hành động:** Màn hình chào mừng để người dùng chọn **Đăng nhập** hoặc **Đăng ký** (hoặc đóng popup nếu không muốn)
2. **Bước 2 — Chọn phương thức:** Hiển thị form tương ứng với 3 tab phương thức (Username, Wallet, Email)

### User Stories

- **US-1:** Là người chơi mới, tôi muốn thấy rõ ràng 2 lựa chọn "Đăng nhập" và "Đăng ký" khi popup mở, để tôi không bị nhầm lẫn.
- **US-2:** Là người chơi đã có tài khoản, tôi muốn chọn "Đăng nhập" rồi chọn phương thức (username/wallet/email) quen thuộc.
- **US-3:** Là người chơi mới, tôi muốn chọn "Đăng ký" rồi tạo tài khoản bằng phương thức tôi thích.
- **US-4:** Tôi muốn quay lại bước trước bất cứ lúc nào (nút back).
- **US-5:** Tôi muốn popup animation mượt mà, responsive trên mobile và desktop.

### Thành công khi (Success Criteria)

- [ ] SC-1: Popup mở ra hiển thị màn hình chọn Login/Register (không nhảy thẳng vào form)
- [ ] SC-2: Chọn Login → hiển thị 3 tab (Username, Wallet, Email) ở chế độ đăng nhập
- [ ] SC-3: Chọn Register → hiển thị 3 tab ở chế độ đăng ký (Wallet tab chỉ hiển thị "Connect wallet" vì wallet tự đăng ký)
- [ ] SC-4: Nút Back quay về màn hình chọn từ bất kỳ tab nào
- [ ] SC-5: Animation chuyển bước mượt mà (framer-motion, reuse pattern từ `Modal.tsx`)
- [ ] SC-6: Responsive — hoạt động tốt trên mobile (≥ 320px) và desktop
- [ ] SC-7: Accessible — focus trap, keyboard navigation (Tab/Escape), aria labels, WCAG 2.1 AA
- [ ] SC-8: Tất cả consumer hiện tại (`requireSignIn()`, `useSession()`) hoạt động không đổi
- [ ] SC-9: Zero type errors, zero lint errors
- [ ] SC-10: Coverage dòng thay đổi ≥ 80%, project ratchet ≥ 62.5%
- [ ] SC-11: Bundle size không tăng quá 150 kB gzip/route
- [ ] SC-12: Production build thành công (`npm run build`)

## Tech Stack

| Layer | Công nghệ | Phiên bản |
|-------|-----------|-----------|
| Framework | Next.js (App Router) | 15.x |
