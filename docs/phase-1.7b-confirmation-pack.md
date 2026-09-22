# AffiliateOS Phase 1.7B — Business Confirmation Pack

Dokumen ini disiapkan untuk keputusan Dinda atau business owner. Semua pertanyaan di bawah masih **OPEN — DINDA CONFIRMATION REQUIRED**. Pilihan belum diisi oleh sistem.

## BQ-01 — Shopee Affiliate Revenue

- **Keputusan:** Apakah revenue memakai gross verified Purchase Value atau dikurangi refund?
- **Perilaku report lama:** Report Simba 1–6 Agustus cocok dengan gross verified Purchase Value.
- **Perilaku aplikasi saat ini:** Import operasional memakai Purchase Value dikurangi Refund Amount.
- **Contoh:** Purchase Value Rp100.000 dan refund Rp20.000. Opsi A menghasilkan Rp100.000; opsi B menghasilkan Rp80.000.
- **Pilihan:** A. Gross verified · B. Net setelah refund · C. Tergantung template · D. Tetap unresolved
- **Dampak:** Affiliate Revenue, ASP, ROI, Cost Ratio, Contribution, Growth.
- **Jawaban:** ____________________
- **Berlaku mulai:** ____________________

## BQ-02 — Shopee Reporting Date

- **Keputusan:** Timestamp mana yang menentukan periode report?
- **Perilaku report lama:** Minggu tervalidasi cocok dengan Order Time.
- **Perilaku aplikasi saat ini:** Memakai field tanggal yang dipetakan saat import.
- **Contoh:** Order dibuat 31 Agustus, selesai 2 September; pilihan timestamp menentukan report Agustus atau September.
- **Pilihan:** A. Order Time · B. Completed Time · C. Conversion Time · D. Tergantung template · E. Tetap unresolved
- **Dampak:** Keanggotaan periode, H-2, Growth.
- **Jawaban:** ____________________
- **Berlaku mulai:** ____________________

## BQ-03 — Shopee Quantity

- **Keputusan:** Qty menghitung baris order-item atau unit produk?
- **Perilaku report lama:** Qty 420 sama dengan jumlah baris valid, bukan total kolom Qty.
- **Perilaku aplikasi saat ini:** Menjumlahkan quantity/unit dari sumber.
- **Contoh:** Satu baris berisi Qty 3. Opsi A menghitung 1 baris; opsi B menghitung 3 unit.
- **Pilihan:** A. Order-item lines · B. Product units · C. Tergantung template · D. Tetap unresolved
- **Dampak:** Qty, ASP, volume produk.
- **Jawaban:** ____________________
- **Berlaku mulai:** ____________________

## BQ-04 — TikTok Reporting Date

- **Keputusan:** Timestamp, format tanggal, dan timezone TikTok mana yang dipakai?
- **Perilaku report lama:** Minggu tervalidasi cocok dengan Time Created format DD/MM/YYYY.
- **Perilaku aplikasi saat ini:** Memerlukan tanggal ISO yang dipetakan dan memakai Asia/Jakarta.
- **Contoh:** Transaksi pukul 23:30 UTC dapat masuk tanggal berikutnya di Jakarta.
- **Pilihan:** A. Time Created Asia/Jakarta · B. Payment Time · C. Commission Paid Time · D. Tergantung template · E. Tetap unresolved
- **Dampak:** Keanggotaan periode, H-2, Growth.
- **Jawaban:** ____________________
- **Berlaku mulai:** ____________________

## BQ-05 — TikTok Commission

- **Keputusan:** Komponen commission apa yang masuk report?
- **Perilaku report lama:** Output Simba memakai Actual Commission Payment dan tidak memasukkan Shop Ads commission.
- **Perilaku aplikasi saat ini:** Memakai satu nilai commission yang dipetakan.
- **Contoh:** Standard commission Rp10.000 dan Shop Ads Rp2.000; hasil dapat Rp10.000 atau Rp12.000.
- **Pilihan:** A. Standard only · B. Standard plus Shop Ads · C. Tergantung template · D. Tetap unresolved
- **Dampak:** Commission, ROI, Cost Ratio.
- **Jawaban:** ____________________
- **Berlaku mulai:** ____________________

## BQ-06 — Store Revenue dan Target Source

- **Keputusan:** Sumber resmi Store Revenue dan target report berasal dari mana?
- **Perilaku report lama:** Raw payment-order yang cocok tidak memiliki Store Revenue; beberapa target kosong.
- **Perilaku aplikasi saat ini:** Store Revenue unavailable; target memakai sistem target/campaign AffiliateOS.
- **Contoh:** Affiliate GMV Rp20 juta tidak cukup untuk menghitung contribution tanpa Store Revenue resmi.
- **Pilihan:** A. Seller Center · B. Commercial/brand report · C. Manual input yang disetujui · D. Tergantung template · E. Tetap unresolved
- **Dampak:** Store Revenue, Contribution, Target Achievement.
- **Jawaban:** ____________________
- **Berlaku mulai:** ____________________

## BQ-07 — Comparable Period

- **Keputusan:** Periode pembanding untuk growth memakai definisi apa?
- **Perilaku report lama:** Bukti yang diberikan hanya memiliki satu periode historis yang cocok.
- **Perilaku aplikasi saat ini:** Memakai rentang tanggal kalender yang sama pada bulan sebelumnya.
- **Contoh:** 1–6 September dapat dibandingkan dengan 1–6 Agustus atau enam hari dengan weekday setara.
- **Pilihan:** A. Same calendar span · B. Same day count · C. Equivalent weekdays · D. H-2 aligned MTD · E. Campaign aligned · F. Tetap unresolved
- **Dampak:** Growth dan narasi tren.
- **Jawaban:** ____________________
- **Berlaku mulai:** ____________________

## BQ-08 — Cross-marketplace Creator Identity

- **Keputusan:** Bagaimana satu orang dengan akun Shopee dan TikTok dihitung?
- **Perilaku report lama:** Parity single-marketplace berhasil memakai username marketplace yang dinormalisasi.
- **Perilaku aplikasi saat ini:** Creator, akun Shopee, dan akun TikTok disimpan sebagai konsep terhubung yang terpisah.
- **Contoh:** Dinda mempunyai satu akun Shopee dan satu akun TikTok; total dapat dihitung satu creator atau dua akun marketplace.
- **Pilihan:** A. Canonical creator · B. Marketplace account · C. Tergantung template · D. Tetap unresolved
- **Dampak:** Total Affiliates, Affiliates With Sales, cross-marketplace reporting.
- **Jawaban:** ____________________
- **Berlaku mulai:** ____________________

Setelah keputusan dibuat, Admin memasukkan pilihan, tanggal efektif, dan catatan di **Settings → Business Rules**. Sistem mengambil identitas actor dari sesi login dan membuat audit event; jawaban tidak boleh ditulis atas nama orang lain.
