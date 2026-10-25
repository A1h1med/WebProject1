const o=document.getElementById('order');
if(o)o.onclick=()=>{const d=o.dataset,q=Math.max(1,+document.getElementById('qty').value||1),s=document.getElementById('size').value;
window.open('https://wa.me/'+d.wa+'?text='+encodeURIComponent(`مرحباً، أرغب في طلب:\nالعطر: ${d.name} (${d.brand})\nالحجم: ${s}\nالكمية: ${q}\nالسعر: ${d.price} ج.م\nالرابط: ${d.url}`),'_blank')};
document.querySelectorAll('form[data-confirm]').forEach(f=>f.onsubmit=e=>{if(!confirm(f.dataset.confirm))e.preventDefault()});
