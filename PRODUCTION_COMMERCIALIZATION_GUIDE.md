# 🚀 HƯỚNG DẪN THỰC THI THƯƠNG MẠI HÓA TOÀN DIỆN (MAINNET & MONETIZATION)
## Dự án: Quick Quiz — Learn to Earn Crypto Web3 Platform

Tài liệu này hướng dẫn chi tiết từng bước để đưa dự án **Quick Quiz** từ môi trường thử nghiệm (Testnet / Localhost) ra **vận hành thương mại thật (Mainnet)** trên thị trường toàn cầu, thu hút người chơi và tạo ra dòng tiền thật cho chủ dự án.

---

## MỤC LỤC
1. [Mô hình kinh tế & Dòng tiền (Business Model)](#1-mô-hình-kinh-tế--dòng-tiền-business-model)
2. [Bước 1: Đưa Web lên Internet (Domain & Hosting)](#bước-1-đưa-web-lên-internet-domain--hosting)
3. [Bước 2: Deploy Smart Contract lên Base Mainnet](#bước-2-deploy-smart-contract-lên-base-mainnet)
4. [Bước 3: Gắn Mạng Quảng Cáo (Kích hoạt nguồn thu)](#bước-3-gắn-mạng-quảng-cáo-kích-hoạt-nguồn-thu)
5. [Bước 4: Tạo Thanh Khoản cho Token $QUIZ trên sàn DEX](#bước-4-tạo-thanh-khoản-cho-token-quiz-trên-sàn-dex)
6. [Bước 5: Thiết lập Chống Bot & Bảo vệ Quỹ Thưởng](#bước-5-thiết-lập-chống-bot--bảo-vệ-quỹ-thưởng)
7. [Dự toán Chi phí Vốn & Doanh thu Dự phóng](#7-dự-toán-chi-phí-vốn--doanh-thu-dự-phóng)
8. [Chiến lược Marketing & Mở rộng người chơi (GTM)](#8-chiến-lược-marketing--mở-rộng-người-chơi-gtm)

---

## 1. Mô hình kinh tế & Dòng tiền (Business Model)

### 1.1. Vòng lặp kinh tế tự động (Economic Flywheel)

```mermaid
flowchart LR
    A["👥 Người chơi mới"] -->|Vào chơi Quiz| B["👀 Xem Banner Quảng Cáo"]
    B -->|Tạo doanh thu| C["💵 Mạng Quảng Cáo trả USD/USDT"]
    C -->|Trích 30% nạp vào| D["🌊 Liquidity Pool (Uniswap)"]
    C -->|Giữ lại 70%| E["💰 Lợi nhuận ròng của Bạn"]
    A -->|Trả lời đúng| F["🪙 Nhận Token $QUIZ"]
    F -->|Đổi ra tiền thật tại| D
    D -->|Nhận được USDC/VND thật| G["🎉 Người chơi có tiền"]
    G -->|Giới thiệu bạn bè| A
```

### 1.2. Tại sao Chủ dự án KHÔNG phải bù lỗ tiền gas?
- Dự án áp dụng công nghệ **EIP-712 Structured Data Signing (Chữ ký mật ngoài chuỗi)**.
- Khi người chơi bấm nhận thưởng:
  1. Máy chủ Next.js của bạn chỉ ký một chuỗi mật mã xác nhận hợp lệ (hoàn toàn **miễn phí, 0 đồng**).
  2. Người chơi tự dùng ví MetaMask/Rainbow của họ để gửi giao dịch lên blockchain Base và **tự trả phí gas** (trên mạng Base chỉ tốn khoảng `0.001$` = 25 VNĐ / giao dịch).
  3. Dù có 10.000 hay 1.000.000 lượt claim, tài khoản của bạn **không bị trừ 1 xu phí gas nào**.

---

## Bước 1: Đưa Web lên Internet (Domain & Hosting)

Hiện tại web đang chạy tại `http://localhost:3000`. Để cả thế giới truy cập được, bạn cần tên miền và máy chủ công khai.

### 1.1. Mua Tên miền (Domain)
- Mua tại **Namecheap**, **Cloudflare Registrar** hoặc **Porkbun**.
- Đuôi tên miền khuyến nghị cho Web3: `.xyz`, `.io`, `.gg`, `.app`.
  - Ví dụ: `quickquiz.xyz`, `cryptoquiz.gg`
  - Chi phí: khoảng **2$ - 5$ / năm** đối với đuôi `.xyz`.

### 1.2. Deploy lên Vercel (Cách khuyến nghị — Miễn phí & Cực nhanh)
Vercel là nền tảng tối ưu nhất cho Next.js, có gói **Hobby (Free)** chịu tải được hàng chục nghìn lượt truy cập mỗi ngày.

1. Đăng ký tài khoản tại [https://vercel.com/](https://vercel.com/) (đăng nhập bằng tài khoản GitHub).
2. Nhấn **Add New...** ➔ **Project**.
3. Chọn kho mã nguồn GitHub của bạn: `Heizdoobert/Quiz_web`.
4. Trong phần **Environment Variables**, sao chép toàn bộ biến môi trường từ file `.env` vào:
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`
   - `REWARD_SIGNER_PRIVATE_KEY`
   - `NEXT_PUBLIC_QUIZ_TOKEN_ADDRESS`
   - `NEXT_PUBLIC_QUIZ_BADGE_ADDRESS`
   - `NEXT_PUBLIC_CHAIN_ID`
5. Nhấn nút **Deploy**. Sau 2 phút, trang web sẽ có đường dẫn công khai (ví dụ `quick-quiz.vercel.app`).
6. Vào mục **Settings ➔ Domains** trên Vercel để trỏ tên miền riêng bạn đã mua vào.

*(Hoặc nếu bạn muốn tự chạy trên VPS Linux riêng bằng Docker, chỉ cần thuê VPS Hetzner / DigitalOcean giá ~4$/tháng và dùng lệnh `docker compose up -d web` kèm Nginx).*

---

## Bước 2: Deploy Smart Contract lên Base Mainnet

Mạng **Base Mainnet** (Chain ID: `8453`) là mạng chính thức có thanh khoản thật của Coinbase.

### 2.1. Chuẩn bị ETH thật trên Base Mainnet
1. Mua khoảng **5$ - 10$ ETH** trên sàn giao dịch (Binance, OKX, Bybit).
2. Bấm **Rút tiền (Withdraw)**:
   - Chọn mạng rút: **Base** (Base Mainnet).
   - Địa chỉ nhận: Ví của bạn (`0xEAa6c3b72E09b7B9a7656C1140761823D024aC28`).
   - Phí rút sàn Base cực kỳ rẻ (chỉ khoảng 0.0001 ETH ~ 5.000 VNĐ).

### 2.2. Thêm cấu hình Base Mainnet vào `contracts/hardhat.config.ts`
Trong file `contracts/hardhat.config.ts`, thêm network `baseMainnet`:
```typescript
baseMainnet: {
  url: "https://mainnet.base.org",
  accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
}
```

### 2.3. Chạy lệnh Deploy lên Mainnet
Chạy lệnh sau tại thư mục dự án:
```bash
cd /mnt/second_drive/web_quiz/contracts
npx hardhat run scripts/deploy.ts --network baseMainnet
```
*(Chi phí gas deploy thực tế trên Base chỉ tốn khoảng **1.0$ - 2.5$ USD**)*.

### 2.4. Cập nhật cấu hình Web
1. Ghi nhận 2 địa chỉ hợp đồng mới được in ra (QuizToken và QuizBadgeNFT).
2. Trong file `.env` (hoặc trên Vercel Environment Variables):
   - Đổi `NEXT_PUBLIC_CHAIN_ID=8453`
   - Đổi `NEXT_PUBLIC_QUIZ_TOKEN_ADDRESS=0x<dia_chi_token_mainnet>`
   - Đổi `NEXT_PUBLIC_QUIZ_BADGE_ADDRESS=0x<dia_chi_badge_mainnet>`
3. Chạy lệnh đồng bộ ABI:
   ```bash
   cd /mnt/second_drive/web_quiz/contracts && npx ts-node scripts/sync-abi.ts
   ```
4. Rebuild lại web app.

---

## Bước 3: Gắn Mạng Quảng Cáo (Kích hoạt nguồn thu)

Đây là nơi bạn **thu tiền về túi**:

### 3.1. Các Mạng Quảng Cáo Crypto tốt nhất
| Mạng quảng cáo | Ưu điểm | Phương thức thanh toán | Link đăng ký |
|---|---|---|---|
| **A-Ads (Anonymous Ads)** | Không cần KYC, duyệt web ngay trong 5 phút, chuyên crypto | Bitcoin, USDT, TRX trực tiếp về ví | [a-ads.com](https://a-ads.com) |
| **Coinzilla** | Mạng quảng cáo Web3 lớn nhất thế giới, giá trả cho lượt xem (eCPM) cao | USDT, Bitcoin, Wire Bank | [coinzilla.com](https://coinzilla.com) |
| **Slise / Persona3** | Mạng quảng cáo Web3 thế hệ mới nhắm theo lịch sử on-chain của ví | USDC về ví Web3 | [slise.xyz](https://slise.xyz) |
| **Google AdSense** | Phổ biến nhất, lượng nhà quảng cáo khổng lồ | Chuyển khoản ngân hàng Việt Nam | [adsense.google.com](https://adsense.google.com) |

### 3.2. Vị trí gắn quảng cáo trong code
Trong dự án, tôi đã cấu hình sẵn component [`components/AdZone.tsx`](file:///mnt/second_drive/web_quiz/components/AdZone.tsx) ở 3 vị trí chiến lược:
1. **Desktop Skyscraper (Cột bên trái & bên phải):** Kích thước chuẩn `160x600` hoặc `300x600`.
2. **Mobile / Web Sticky Banner (Chân trang):** Kích thước chuẩn `728x90` (Desktop) hoặc `320x50` (Mobile).

**Cách gắn mã quảng cáo:**
Khi bạn đăng ký tài khoản trên A-Ads hoặc Coinzilla, họ sẽ cung cấp 1 đoạn mã HTML/JavaScript (Script Tag). Bạn chỉ việc mở file `components/AdZone.tsx` và dán mã đó vào thẻ placeholder có sẵn.

---

## Bước 4: Tạo Thanh Khoản cho Token $QUIZ trên sàn DEX

Để người chơi có thể **đổi token `$QUIZ` lấy tiền thật (USDC / VND)**:

### 4.1. Tạo Pool trên sàn Uniswap (Base Network)
1. Mở trang tạo pool của Uniswap: 👉 [https://app.uniswap.org/positions/create/v2](https://app.uniswap.org/positions/create/v2) (hoặc [Aerodrome Finance](https://aerodrome.finance/)).
2. Kết nối ví Deployer của bạn trên mạng **Base**.
3. Chọn cặp token:
   - Token 1: Dán địa chỉ hợp đồng `$QUIZ` (Mainnet).
   - Token 2: `USDC` (USDC chính thức trên Base).
4. **Nạp số vốn thanh khoản ban đầu:**
   - Ví dụ bạn nạp: **`30$ USDC` + `30,000 $QUIZ`**.
   - Khi đó, giá khởi điểm của token là: **1 $QUIZ = 0.001$ USDC** (1 câu trả lời đúng được 10 $QUIZ ~ 0.01$ = 250 VNĐ).
5. Nhấn **Supply / Create Pool**.

### 4.2. Dòng tiền quy đổi ra VND cho người chơi
- Người chơi cày được `1.000 $QUIZ` trên web của bạn.
- Người chơi vào sàn Uniswap, dán contract `$QUIZ` ➔ Bấm **Swap `$QUIZ` lấy USDC**.
- Họ nhận được **1.0$ USDC** vào ví.
- Họ chuyển 1.0$ USDC lên sàn Binance/OKX và bán P2P lấy tiền VND chuyển khoản ngân hàng trong 1 phút!

---

## Bước 5: Thiết lập Chống Bot & Bảo vệ Quỹ Thưởng

Khi token có giá trị tiền thật, bạn cần bảo vệ hệ thống trước các công cụ auto-click / bot:

1. **Giới hạn số câu hỏi được thưởng mỗi ngày (Daily Cap):**
   - Đặt hạn mức: Mỗi ví tối đa được claim thưởng **100 $QUIZ / ngày** (tương đương 10 câu đúng có thưởng). Các câu trả lời sau đó vẫn tính điểm bảng xếp hạng nhưng không cộng thêm token.
2. **Bật Cloudflare Turnstile (CAPTCHA tàng hình):**
   - Chèn Turnstile xác thực người dùng thật trước khi bấm nộp câu hỏi.
3. **Cơ chế Community Dispute (Đã tích hợp sẵn):**
   - Người dùng tự rà soát câu hỏi sai. Nếu câu hỏi bị 3 lượt khiếu nại, hệ thống tự động cách ly (`quarantined`) khỏi bộ đề để tránh bị khai thác.
4. **Thời gian chờ giữa 2 câu hỏi (Cool-down period):**
   - Đặt thời gian tối thiểu giữa các câu là 3 - 5 giây để bot không thể gửi hàng nghìn request/giây.

---

## 7. Dự toán Chi phí Vốn & Doanh thu Dự phóng

### 7.1. Chi phí vốn ban đầu (Khởi nghiệp dự án)
| Khoản chi | Mục đích | Chi phí ước tính |
|---|---|---|
| **Tên miền .xyz** | Định danh thương hiệu (1 năm) | ~3$ |
| **Hosting Vercel** | Máy chủ web toàn cầu | **0$** (Free tier) |
| **Database Supabase** | Lưu trữ người dùng, điểm, câu hỏi | **0$** (Free tier 500MB) |
| **Phí deploy Base Mainnet** | Đưa 2 Smart Contract lên mạng thật | ~1.5$ |
| **Vốn nạp thanh khoản ban đầu** | Đảm bảo giá trị đổi tiền cho token | ~30$ - 50$ |
| **TỔNG VỐN KHỞI TẠO** | | **~35$ - 55$ (~850.000 - 1.300.000 VNĐ)** |

### 7.2. Dự phóng dòng tiền hàng tháng (Ví dụ với 1.000 người chơi/ngày)
Giả định:
- **1.000 người chơi hoạt động mỗi ngày (DAU)**.
- Mỗi người chơi trả lời trung bình 10 câu hỏi ➔ **10.000 lượt xem trang/ngày** ➔ **300.000 lượt hiển thị quảng cáo (Impressions) / tháng**.

| Chỉ số tài chính | Con số dự phóng |
|---|---|
| **Doanh thu Quảng cáo (eCPM trung bình 2$ - 3$)** | **+600$ - 900$ / tháng** |
| Chi phí duy trì thanh khoản cho người chơi | -150$ - 250$ / tháng |
| Chi phí máy chủ / cơ sở dữ liệu | -0$ (vẫn nằm trong free tier) |
| **LỢI NHUẬN RÒNG CỦA BẠN (NET PROFIT)** | **+450$ - 650$ / tháng (~11.000.000 - 16.000.000 VNĐ)** |

---

## 8. Chiến lược Marketing & Mở rộng người chơi (GTM)

1. **Airdrop cho người chơi sớm:**
   - Thông báo sự kiện: "Top 50 người dẫn đầu bảng xếp hạng tuần này nhận thêm 10$ USDC".
2. **Chia sẻ trên các kênh Crypto Airdrop / Learn-to-Earn:**
   - Đăng bài giới thiệu web lên các hội nhóm Facebook về Crypto, Telegram Airdrop, X (Twitter) với các hashtag: `#LearnToEarn #Web3Quiz #BaseEcosystem #Base #Airdrop`.
3. **Tính năng Giới thiệu bạn bè (Referral):**
   - Thưởng 10 $QUIZ cho người giới thiệu mỗi khi bạn bè của họ đạt chuỗi đúng 5 câu.
4. **Mở rộng kho đề câu hỏi:**
   - Dùng tính năng **"Add Question"** để cộng đồng tự đóng góp câu hỏi mới.

---

> 💡 **TÀI LIỆU LIÊN QUAN TRONG BỘ CODE:**
> - Source code Smart Contract: [`contracts/contracts/QuizToken.sol`](file:///mnt/second_drive/web_quiz/contracts/contracts/QuizToken.sol) & [`QuizBadgeNFT.sol`](file:///mnt/second_drive/web_quiz/contracts/contracts/QuizBadgeNFT.sol)
> - Script Deploy Hardhat: [`contracts/scripts/deploy.ts`](file:///mnt/second_drive/web_quiz/contracts/scripts/deploy.ts)
> - File cấu hình vùng quảng cáo: [`components/AdZone.tsx`](file:///mnt/second_drive/web_quiz/components/AdZone.tsx)
> - Hướng dẫn kỹ thuật tổng quát: [`quick-quiz-operations-guide.md`](file:///home/alexheiz/.gemini/antigravity-cli/brain/a329b2f5-e86a-49a4-99ac-4ad8e3a81222/quick-quiz-operations-guide.md)
