# Site Clone Prompter

**Chrome uzantısı (Manifest V3)** — Herhangi bir web sayfasını analiz ederek, yapay zeka modelleri (ChatGPT, Claude, Gemini, DeepSeek) için piksel düzeyinde doğru bir klon oluşturma promptu üretir ve panoya kopyalar.

---

## Nasıl Çalışır?

1. Herhangi bir sayfaya girin ve uzantı simgesine tıklayın.
2. Açılan popup'ta **"Generate & Copy Prompt"** butonuna basın.
3. Uzantı sayfayı analiz eder; üretilen prompt hem ekranda gösterilir hem de otomatik olarak panoya kopyalanır.
4. Kopyalanan promptu ChatGPT, Claude, Gemini veya DeepSeek'e yapıştırın — model siteyi tek bir `index.html` dosyası olarak yeniden üretir.

---

## Analiz Kapsamı

Uzantı aşağıdaki verileri DOM, CSSOM ve tarayıcı API'larından canlı olarak çeker:

| Kategori | Detay |
|---|---|
| **DOM Yapısı** | Tam hiyerarşi, semantik etiketler, ARIA rolleri, derinlik 6 |
| **Renkler** | Hesaplanmış renkler, kullanım frekansına göre sıralı, 25 renk |
| **Tipografi** | Her element tipi için font-family, size, weight, line-height, letter-spacing |
| **Layout** | CSS Grid (column/row/gap), Flexbox (direction/justify/align), max-width |
| **CSS Değişkenleri** | :root üzerindeki tüm custom property'ler |
| **Animasyonlar** | @keyframes tanımları, transition değerleri, animation property'leri |
| **Görseller** | img src URL'leri, background-image URL'leri, SVG inline örnekleri |
| **Fontlar** | Google Fonts linkleri, @font-face tanımları, font boyut skalası |
| **Shadow & Radius** | box-shadow, text-shadow, filter:drop-shadow, border-radius değerleri |
| **Bileşenler** | 22 farklı UI bileşeni (navbar, modal, carousel, accordion, vb.) |
| **Etkileşimler** | Hover, dropdown, modal, slider, sticky, parallax, lazy-load tespiti |
| **Responsive** | Tüm @media breakpoint sorguları |
| **Framework Tespiti** | React, Vue, Angular, Svelte, Next.js, Nuxt, jQuery, GSAP, Tailwind, Bootstrap |
| **Tam CSS** | Sayfa üzerindeki tüm stylesheet kuralları (15.000 karakter) |
| **Erişilebilirlik** | ARIA label, role, focus-visible kullanım tespiti |

---

## Dosya Yapısı

```
site-clone-prompter/
├── manifest.json      # Uzantı tanımı (Manifest V3)
├── popup.html         # Popup arayüzü
├── popup.js           # Popup mantığı, content script mesajlaşması
├── content.js         # Sayfa analiz motoru, prompt üretici
├── icon16.png
├── icon48.png
└── icon128.png
```

---

## Kurulum (Geliştirici Modu)

> Chrome Web Store'a yüklenmeden doğrudan kullanmak için:

1. Bu repoyu klonlayın veya ZIP olarak indirin:
   ```bash
   git clone https://github.com/KULLANICI_ADINIZ/site-clone-prompter.git
   ```

2. Chrome'da adres çubuğuna şunu yazın:
   ```
   chrome://extensions
   ```

3. Sağ üst köşeden **"Geliştirici modu"**nu etkinleştirin.

4. **"Paketlenmemiş öğe yükle"** butonuna tıklayın.

5. Klonladığınız klasörü seçin.

6. Uzantı araç çubuğuna sabitlemek için puzzle ikonuna tıklayıp **"Site Clone Prompter"**ı sabitleyin.

---

## Üretilen Prompt Yapısı

```
1.  Site Overview          — başlık, URL, dil, framework, viewport
2.  Design Tokens          — CSS değişkenleri, border-radius, shadow sistemi
3.  Color Palette          — frekansa göre sıralı renk listesi
4.  Typography             — tam type scale, font kaynakları, @font-face
5.  Layout System          — CSS Grid detayları, Flexbox detayları, spacing
6.  DOM Structure          — tam hiyerarşi (derinlik 6)
7.  Components             — tespit edilen 22 UI bileşeni
8.  Interactions           — tüm davranış ve etkileşim listesi
9.  Animations             — @keyframes tanımları, transition değerleri
10. Responsive Breakpoints — tüm @media sorguları
11. Assets                 — görsel URL'leri (rol bazlı), SVG örnekleri
12. Extracted CSS          — kaynak CSS kuralları (15.000 karakter)
13. External Dependencies  — script ve stylesheet listesi
14. Accessibility Notes    — ARIA ve erişilebilirlik bilgileri
15. Output Requirements    — modele verilecek kesin kurallar
```

---

## Gereksinimler

- Google Chrome 116 veya üzeri (Manifest V3 desteği)
- Geliştirici modu açık olmalı (Chrome Web Store'dan yüklenmediği sürece)

---

## Lisans

MIT
