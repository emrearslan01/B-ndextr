# BINDEX — tanıtım sitesi

Premium deri laptop/belge organizer'ı **BINDEX** için tek sayfalık tanıtım sitesi.
Saf statik: HTML + CSS + vanilla JS (ES modules). Framework yok, backend yok, **zorunlu build adımı yok**.
Tamamen offline çalışır (font, Three.js, QR kütüphanesi lokal; ilk ziyaretten sonra service worker her şeyi önbelleğe alır).

```
public/
  index.html
  css/style.css
  js/main.js        giriş noktası (config → sayfa, QR, modülleri başlatır)
  js/scroll-fx.js   reveal, parallax, ink text, pinned bölümler (--v / --p)
  js/showroom.js    Three.js 3D sahnesi + renk/çekecek configurator'ı
  js/config.js      tüm ayarlar (site URL'si, renkler, fiyat metni, iletişim…)
  vendor/           three.min.js (r149), qrcode.mjs
  assets/img/       ürün fotoğrafı (AVIF / WebP / PNG, 4 genişlik) + og-image.jpg
  assets/icons/     favicon.svg, favicon-32.png, apple-touch-icon.png, manifest ikonları
  assets/fonts/     Inter 300–700 woff2 (latin + latin-ext)
  sw.js             offline önbellek
  _headers          Cloudflare cache + güvenlik header'ları
scripts/            isteğe bağlı yardımcılar (görsel optimizasyonu, ikonlar, ekran görüntüsü testi)
```

## Lokal çalıştırma

```bash
npm install
npm run dev          # npx wrangler pages dev public → http://127.0.0.1:8788
```

Wrangler olmadan herhangi bir statik sunucu da olur (ör. `npx serve public`). Dosyayı doğrudan
`file://` ile açmayın, ES modülleri bir HTTP sunucusu ister.

Görsel test (dev sunucusu açıkken):

```bash
npx playwright install chromium   # bir kez
npm run shots                     # screenshots/ altına 360 → 3840 px ekran görüntüleri, console + taşma kontrolü
```

## İçerik değiştirme: `public/js/config.js`

| Ayar | Ne yapar |
| --- | --- |
| `SITE_URL` | Footer'daki QR kodu ve "bindex.pages.dev ›" linki buradan üretilir. Canlı domain değişirse sadece bunu değiştirin. |
| `ACCENT` | Marka rengi (`--accent`). Varsayılan `#8A6B3E`. |
| `CONTENT.priceText` | Kapanış bölümündeki fiyat cümlesi. |
| `CONTENT.email / instagram / linkedin` | Footer iletişim linkleri. |
| `CONTENT.fairLocation / fairDates` | Footer'daki fuar bilgisi. |
| `COLORS` | Configurator renkleri: `leather`/`band` 3D malzeme rengi, `swatch` buton rengi, `photoX` WebGL yoksa fotoğrafın hangi kısmının gösterileceği (0/50/100 %). |
| `PULLS` | Fermuar çekeceği renkleri. |
| `DEFAULT_SELECTION` | Açılıştaki seçim. |
| `SHOWROOM` | Three.js yolu, pixel ratio sınırı, shadow map boyutları, isteğe bağlı `.glb` yolu. |

Diğer metinler doğrudan `public/index.html` içindedir.

> **Domain değişince ayrıca:** `index.html` içindeki `canonical`, `og:url`, `og:image`, `twitter:image`
> etiketlerini, `robots.txt` ve `sitemap.xml` dosyalarını güncelleyin (bunlar JS çalışmadan okunduğu için config'ten gelmez).

> **Görsel değiştirirken:** `assets/` ve `vendor/` 1 yıl `immutable` cache'lenir. Dosyayı aynı isimle
> değiştirmek yerine yeni isim verin (ör. `bindex-colors-v2.avif`) ve `sw.js` içindeki `VERSION`'ı artırın.
> Yeni fotoğraf için: kaynağı `bindex-reference/assets/bindex-colors.png` yoluna koyup `npm run images`.

## Gerçek 3D modeli (.glb) kullanma

`showroom.js` şu an ürünü prosedürel olarak çiziyor (`buildCase()`). Gerçek modele geçmek için:

1. Modeli Blender vb.'den **glTF Binary (.glb)** olarak dışa aktarın. Ölçek: yaklaşık 2.7 × 4.0 birim
   (genişlik × yükseklik), orijin ortada, ön yüz +Z'ye bakıyor. Draco sıkıştırma kullanmayın (ek decoder gerektirir).
   Malzemelere `Leather`, `Band`, `Pull` isimlerini verin ki configurator renkleri değiştirebilsin.
2. Dosyayı `public/assets/models/bindex.glb` olarak koyun, `config.js` → `SHOWROOM.modelUrl: 'assets/models/bindex.glb'`.
3. Three r149'da GLTFLoader yalnızca ES module olarak gelir (`examples/jsm`) ve `'three'` modülünü import eder.
   Bu yüzden UMD `three.min.js` yerine modül sürümüne geçin (hâlâ build adımı yok):

   ```bash
   npm i -D three@0.149.0
   mkdir -p public/vendor/jsm/loaders public/vendor/jsm/utils
   cp node_modules/three/build/three.module.js public/vendor/
   cp node_modules/three/examples/jsm/loaders/GLTFLoader.js public/vendor/jsm/loaders/
   cp node_modules/three/examples/jsm/utils/BufferGeometryUtils.js public/vendor/jsm/utils/
   ```

   `index.html` içinde, `main.js` script'inden **önce** bir import map ekleyin:

   ```html
   <script type="importmap">{ "imports": { "three": "./vendor/three.module.js" } }</script>
   ```

   `showroom.js` → `boot()` içinde `await loadScript(SHOWROOM.threeSrc);` satırını şununla değiştirin:

   ```js
   window.THREE = await import('three');
   const { GLTFLoader } = await import('../vendor/jsm/loaders/GLTFLoader.js');
   window.THREE_GLTFLoader = GLTFLoader;
   ```

   Ayrıca `sw.js` PRECACHE listesine yeni dosyaları ekleyin.

4. `createScene()` içinde `const model = buildCase(T, mats, bump);` satırını değiştirin:

   ```js
   let model;
   if (SHOWROOM.modelUrl) {
     const gltf = await new window.THREE_GLTFLoader().loadAsync(SHOWROOM.modelUrl);
     model = gltf.scene;
     model.traverse((o) => {
       if (!o.isMesh) return;
       o.castShadow = true;
       // configurator'ın renkleri değiştirebilmesi için kendi malzemelerimizi bağla
       const n = o.material.name;
       if (n === 'Leather') o.material = mats.leather;
       else if (n === 'Band') o.material = mats.band;
       else if (n === 'Pull') o.material = mats.pullMat;
     });
   } else {
     model = buildCase(T, mats, bump);
   }
   ```

   Model kendi dokularıyla gelecekse ve renkleri .glb içindeki malzemelerle değiştirmek isterseniz,
   eşleştirme yerine `o.material.color` değerini `setColors()` içinde güncelleyin.
5. Model yüklenemezse `boot()` içindeki `catch` otomatik olarak fotoğraf fallback'ini gösterir.

## Cloudflare Pages'e GitHub'dan bağlama

1. Repo'yu GitHub'a pushlayın (aşağıya bakın).
2. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. GitHub hesabını yetkilendirin, `B-ndextr` reposunu seçin.
4. Build ayarları:
   - **Production branch:** `main`
   - **Framework preset:** None
   - **Build command:** *(boş bırakın)*
   - **Build output directory:** `public`
5. **Save and Deploy**. Site `https://bindex.pages.dev` (veya Cloudflare'ın verdiği isim) adresinde yayına girer.
   Proje adı farklı çıkarsa `config.js` → `SITE_URL` ve yukarıdaki SEO etiketlerini güncelleyin.
6. Her `main` push'u otomatik deploy olur; diğer branch'ler preview URL'si alır.
7. Özel domain: Pages projesi → **Custom domains** → **Set up a custom domain**.

CLI ile doğrudan deploy (Git bağlamadan):

```bash
npx wrangler login
npm run deploy       # npx wrangler pages deploy public --project-name=b-ndextr
```

## GitHub

```bash
git remote add origin https://github.com/emrearslan01/B-ndextr.git   # zaten ekli
git push -u origin main
```

Repo yoksa önce github.com/new üzerinden (ör. `B-ndextr` adıyla, README eklemeden) oluşturun, ya da
[GitHub CLI](https://cli.github.com/) ile: `gh repo create bindex --public --source=. --push`.

## Notlar

- Scroll animasyonları tamamen JS ile sürülür (`IntersectionObserver` + `--v` / `--p` CSS değişkenleri). CSS scroll-timeline kullanılmaz; Safari, Chrome ve Firefox'ta aynı çalışır.
- 3D sahne yalnızca kullanıcı bölüme yaklaşınca yüklenir. Canvas görünmezken veya sekme arka plandayken render döngüsü durur. Pixel ratio ≤ 2'dir, toplam piksel ~4K ile sınırlıdır, mobilde shadow map 1024'tür.
- WebGL yoksa ürün fotoğrafı gösterilir. Renk seçimi fotoğrafı ilgili kılıfa kaydırır.
- Mobilde yalnızca yatay sürükleme ürünü çevirir. Dikey kaydırma sayfayı kaydırmaya devam eder.
- `prefers-reduced-motion`: giriş/scroll animasyonları kapanır, metinler doğrudan görünür, 3D modelin süzülmesi durur.
- Küçük metinlerde (bej zemin) erişilebilir kontrast için accent'in bir ton koyusu (`--accent-ink: #7A5C30`) kullanılır.
