const express=require('express'),Database=require('better-sqlite3'),multer=require('multer'),helmet=require('helmet'),compression=require('compression'),crypto=require('crypto'),path=require('path'),fs=require('fs');
const {PORT=3000,ADMIN_USER='admin',ADMIN_PASS,SECRET,WA_NUMBER='201000000000',SITE_URL='http://localhost:3000',STORE_NAME='مَسك'}=process.env;
if(!ADMIN_PASS||!SECRET){console.error('اضبط ADMIN_PASS و SECRET في متغيرات البيئة');process.exit(1)}
fs.mkdirSync('data/uploads',{recursive:true});
const db=new Database('data/store.db');
db.exec(`CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY,name TEXT,brand TEXT,cat TEXT,price REAL,sizes TEXT,conc TEXT,notes TEXT,descr TEXT,img TEXT,stock INT DEFAULT 1,featured INT DEFAULT 0,isnew INT DEFAULT 0)`);
const CATS={men:'رجالي',women:'نسائي',unisex:'مشترك'};
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hm=v=>crypto.createHmac('sha256',SECRET).update(v).digest('hex');
const sha=v=>crypto.createHash('sha256').update(String(v)).digest();
const same=(a,b)=>crypto.timingSafeEqual(sha(a),sha(b));
const app=express();app.disable('x-powered-by');app.set('trust proxy',1);
app.use(helmet(),compression(),express.urlencoded({extended:false,limit:'20kb'}));
app.use(express.static('public',{maxAge:'7d'}));app.use('/uploads',express.static('data/uploads',{maxAge:'30d'}));
const ck=r=>Object.fromEntries((r.headers.cookie||'').split(';').filter(Boolean).map(c=>c.trim().split('=')));
const isAdmin=r=>{const t=ck(r).s;if(!t)return false;const[x,sig]=t.split('.');return sig&&x>Date.now()&&same(sig,hm(x))};
const guard=(q,s,n)=>isAdmin(q)?n():s.redirect('/admin/login');
const up=multer({storage:multer.diskStorage({destination:'data/uploads',filename:(q,f,cb)=>cb(null,crypto.randomBytes(12).toString('hex')+({'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp'}[f.mimetype]||'.bin'))}),limits:{fileSize:3e6},fileFilter:(q,f,cb)=>cb(null,/^image\/(jpeg|png|webp)$/.test(f.mimetype))});
const page=(t,d,b,adm)=>`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(t)} | ${STORE_NAME}</title><meta name="description" content="${e(d||'عطور أصلية رجالية ونسائية ومشتركة، اطلب عبر واتساب')}"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap"><link rel="stylesheet" href="/style.css"></head><body><header><div class="w"><a class="logo" href="/">✦ ${STORE_NAME}</a><nav><a href="/">الرئيسية</a><a href="/products">كل المنتجات</a><a href="/categories">التصنيفات</a><a href="/about">من نحن</a><a href="/contact">تواصل معنا</a></nav></div></header><main class="w">${b}</main><footer>© ${STORE_NAME}</footer><script src="/app.js" defer></script></body></html>`;
const card=p=>`<a class="c" href="/product/${p.id}"><div class="im">${p.img?`<img loading="lazy" src="/uploads/${e(p.img)}" alt="${e(p.name)}">`:'🧴'}${p.isnew?'<span class="bd">جديد</span>':''}</div><div class="cb"><small>${e(p.brand)} · ${CATS[p.cat]||''}</small><b>${e(p.name)}</b><div class="pr">${p.price} ج.م${p.stock?'':' <i class="out">غير متوفر</i>'}</div></div></a>`;
const grid=l=>l.length?`<div class="g">${l.map(card).join('')}</div>`:'<p>لا توجد منتجات.</p>';
const all=(w='1',a=[])=>db.prepare(`SELECT * FROM products WHERE ${w} ORDER BY id DESC`).all(...a);
app.get('/',(q,s)=>s.send(page('الرئيسية','',`<section class="hero"><h1>عطرك… توقيعك الخاص</h1><a class="btn" href="/products">تسوّق الآن</a></section><h2>العطور المميزة</h2>${grid(all('featured=1'))}<h2>وصل حديثاً</h2>${grid(all('isnew=1'))}`)));
app.get('/categories',(q,s)=>s.send(page('التصنيفات','',`<h2>التصنيفات</h2><div class="g">${Object.entries(CATS).map(([k,v])=>`<a class="c cb" href="/products?cat=${k}"><b>عطور ${v}</b></a>`).join('')}</div>`)));
app.get('/products',(q,s)=>{const{q:t='',brand='',cat='',max=''}=q.query;const w=['1'],a=[];
 if(t){w.push('(name LIKE ? OR brand LIKE ?)');a.push(`%${t}%`,`%${t}%`)}if(brand){w.push('brand=?');a.push(brand)}if(CATS[cat]){w.push('cat=?');a.push(cat)}if(+max){w.push('price<=?');a.push(+max)}
 const br=db.prepare('SELECT DISTINCT brand FROM products ORDER BY brand').all();
 s.send(page('كل المنتجات','',`<h2>المنتجات</h2><form class="f" method="get"><input name="q" placeholder="ابحث..." value="${e(t)}"><select name="cat"><option value="">كل التصنيفات</option>${Object.entries(CATS).map(([k,v])=>`<option value="${k}"${cat===k?' selected':''}>${v}</option>`).join('')}</select><select name="brand"><option value="">كل الماركات</option>${br.map(b=>`<option${brand===b.brand?' selected':''}>${e(b.brand)}</option>`).join('')}</select><input name="max" type="number" placeholder="أقصى سعر" value="${e(max)}"><button class="btn">تصفية</button></form>${grid(all(w.join(' AND '),a))}`))});
app.get('/product/:id',(q,s)=>{const p=db.prepare('SELECT * FROM products WHERE id=?').get(+q.params.id);if(!p)return s.status(404).send(page('غير موجود','','<h2>المنتج غير موجود</h2>'));
 const sz=String(p.sizes||'').split(',').map(x=>x.trim()).filter(Boolean),nt=String(p.notes||'').split(',').filter(x=>x.trim());
 s.send(page(p.name,p.descr,`<div class="pd"><div class="im">${p.img?`<img src="/uploads/${e(p.img)}" alt="${e(p.name)}">`:'🧴'}</div><div><small>${e(p.brand)} · ${CATS[p.cat]}</small><h1>${e(p.name)}</h1><div class="pr big">${p.price} ج.م</div><p>${e(p.descr)}</p><p><b>التركيز:</b> ${e(p.conc)}</p><p><b>النفحات:</b> ${nt.map(n=>`<span class="chip">${e(n.trim())}</span>`).join('')}</p><p><b>التوفر:</b> ${p.stock?'متوفر':'<span class="out">غير متوفر</span>'}</p>
 <p><b>الحجم:</b> <select id="size">${sz.map(z=>`<option>${e(z)}</option>`).join('')}</select> <b>الكمية:</b> <input id="qty" type="number" min="1" value="1" style="width:70px"></p>
 <button class="btn wa" id="order" ${p.stock?'':'disabled'} data-wa="${e(WA_NUMBER)}" data-name="${e(p.name)}" data-brand="${e(p.brand)}" data-price="${p.price}" data-url="${e(SITE_URL+'/product/'+p.id)}">اطلب عبر واتساب</button></div></div>`))});
app.get('/about',(q,s)=>s.send(page('من نحن','',`<h2>من نحن</h2><div class="box">${STORE_NAME} متجر متخصص في العطور الأصلية للرجال والنساء. (عدّل هذا النص في server.js)</div>`)));
app.get('/contact',(q,s)=>s.send(page('تواصل معنا','',`<h2>تواصل معنا</h2><div class="box"><a class="btn wa" href="https://wa.me/${e(WA_NUMBER)}">راسلنا على واتساب</a></div>`)));
app.get('/robots.txt',(q,s)=>s.type('text').send(`User-agent: *\nDisallow: /admin\nSitemap: ${SITE_URL}/sitemap.xml`));
app.get('/sitemap.xml',(q,s)=>s.type('xml').send(`<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['','/products','/about','/contact',...all().map(p=>'/product/'+p.id)].map(u=>`<url><loc>${SITE_URL}${u}</loc></url>`).join('')}</urlset>`));
// ---- Admin ----
const fails={};
app.get('/admin/login',(q,s)=>s.send(page('دخول','',`<h2>دخول المدير</h2><form class="box fm" method="post">${q.query.err?'<p class="out">بيانات غير صحيحة</p>':''}<input name="u" placeholder="اسم المستخدم" required><input name="p" type="password" placeholder="كلمة المرور" required><button class="btn">دخول</button></form>`)));
app.post('/admin/login',(q,s)=>{const f=fails[q.ip]||{n:0,t:0};if(f.n>=5&&Date.now()-f.t<9e5)return s.status(429).send('محاولات كثيرة، حاول لاحقاً');
 if(same(q.body.u,ADMIN_USER)&&same(q.body.p,ADMIN_PASS)){delete fails[q.ip];const x=Date.now()+864e5;s.setHeader('Set-Cookie',`s=${x}.${hm(String(x))}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400${SITE_URL.startsWith('https')?'; Secure':''}`);return s.redirect('/admin')}
 fails[q.ip]={n:f.n+1,t:Date.now()};s.redirect('/admin/login?err=1')});
app.post('/admin/logout',(q,s)=>{s.setHeader('Set-Cookie','s=; Path=/; Max-Age=0');s.redirect('/')});
const form=p=>`<form class="box fm" method="post" action="/admin/save" enctype="multipart/form-data"><input type="hidden" name="id" value="${p.id||''}">${[['name','الاسم'],['brand','العلامة التجارية'],['price','السعر','number'],['sizes','الأحجام (50مل,100مل)'],['conc','التركيز'],['notes','النفحات (بفواصل)']].map(([k,l,t])=>`<label>${l}<input name="${k}" type="${t||'text'}" value="${e(p[k])}" required></label>`).join('')}<label>التصنيف<select name="cat">${Object.entries(CATS).map(([k,v])=>`<option value="${k}"${p.cat===k?' selected':''}>${v}</option>`).join('')}</select></label><label>الصورة<input type="file" name="img" accept="image/*"></label><label class="full">الوصف<textarea name="descr" rows="3">${e(p.descr)}</textarea></label><label><input type="checkbox" name="stock"${p.stock!==0?' checked':''}> متوفر</label><label><input type="checkbox" name="featured"${p.featured?' checked':''}> مميز</label><label><input type="checkbox" name="isnew"${p.isnew?' checked':''}> جديد</label><button class="btn">حفظ</button></form>`;
app.get('/admin',guard,(q,s)=>s.send(page('لوحة التحكم','',`<h2>لوحة التحكم</h2><a class="btn" href="/admin/new">+ منتج جديد</a> <form method="post" action="/admin/logout" style="display:inline"><button class="btn o">خروج</button></form><div class="tbl box"><table>${all().map(p=>`<tr><td>${e(p.name)}</td><td>${p.price}</td><td><form method="post" action="/admin/stock/${p.id}"><button class="btn o">${p.stock?'متوفر ✓':'نفد ✗'}</button></form></td><td><a class="btn o" href="/admin/edit/${p.id}">تعديل</a></td><td><form method="post" action="/admin/delete/${p.id}" data-confirm="حذف المنتج؟"><button class="btn r">حذف</button></form></td></tr>`).join('')}</table></div>`)));
app.get('/admin/new',guard,(q,s)=>s.send(page('منتج جديد','',`<h2>منتج جديد</h2>${form({})}`)));
app.get('/admin/edit/:id',guard,(q,s)=>{const p=db.prepare('SELECT * FROM products WHERE id=?').get(+q.params.id);p?s.send(page('تعديل','',`<h2>تعديل</h2>${form(p)}`)):s.redirect('/admin')});
app.post('/admin/save',guard,up.single('img'),(q,s)=>{const b=q.body,id=+b.id||0,o=id?db.prepare('SELECT img FROM products WHERE id=?').get(id):null;
 const v=[b.name,b.brand,CATS[b.cat]?b.cat:'unisex',+b.price||0,b.sizes,b.conc,b.notes,b.descr,q.file?q.file.filename:(o&&o.img)||'',b.stock?1:0,b.featured?1:0,b.isnew?1:0];
 if(id)db.prepare('UPDATE products SET name=?,brand=?,cat=?,price=?,sizes=?,conc=?,notes=?,descr=?,img=?,stock=?,featured=?,isnew=? WHERE id=?').run(...v,id);
 else db.prepare('INSERT INTO products(name,brand,cat,price,sizes,conc,notes,descr,img,stock,featured,isnew) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(...v);s.redirect('/admin')});
app.post('/admin/stock/:id',guard,(q,s)=>{db.prepare('UPDATE products SET stock=1-stock WHERE id=?').run(+q.params.id);s.redirect('/admin')});
app.post('/admin/delete/:id',guard,(q,s)=>{db.prepare('DELETE FROM products WHERE id=?').run(+q.params.id);s.redirect('/admin')});
app.listen(PORT,()=>console.log('http://localhost:'+PORT));
