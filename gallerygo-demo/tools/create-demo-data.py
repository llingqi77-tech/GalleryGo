"""Optional authoring utility. The shipped app needs no build or Python dependency."""
import json
from pathlib import Path
from html import escape

ROOT = Path(__file__).resolve().parents[1]
IMAGES = ROOT / "images"
IMAGES.mkdir(exist_ok=True)

CATEGORIES = [
    {"id": "all", "name": "全部"},
    {"id": "payment", "name": "支付截图", "description": "转账、付款与收款资料", "color": "#1E6FFF", "symbol": "↗"},
    {"id": "order", "name": "订单物流", "description": "购物订单与配送信息", "color": "#F28A44", "symbol": "□"},
    {"id": "chat", "name": "聊天记录", "description": "沟通截图与重要对话", "color": "#2AA978", "symbol": "▤"},
    {"id": "idcard", "name": "证件票据", "description": "证件、票据与文件", "color": "#8D73CD", "symbol": "▧"},
    {"id": "work", "name": "工作经营", "description": "工作记录与经营素材", "color": "#B5845E", "symbol": "▦"},
    {"id": "festival", "name": "节庆生活", "description": "节日、家庭与生活照片", "color": "#2A9EA1", "symbol": "✧"},
]

def txt(x, y, value, size=35, fill="#24334A", weight=400, anchor="start"):
    return f'<text x="{x}" y="{y}" font-size="{size}" fill="{fill}" font-weight="{weight}" text-anchor="{anchor}">{escape(str(value))}</text>'

def base(body, color, label, variant=0):
    blur = ' filter="url(#soft)"' if variant == 2 else ''
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
<defs><filter id="soft"><feGaussianBlur stdDeviation="1.2"/></filter><linearGradient id="bg" x2="1" y2="1"><stop stop-color="{color}"/><stop offset="1" stop-color="#f4f6fb"/></linearGradient></defs>
<rect width="900" height="1200" rx="20" fill="url(#bg)"/>
<g font-family="Arial,Microsoft YaHei,sans-serif"{blur}>{body}</g>
<rect x="28" y="1124" width="844" height="48" rx="12" fill="#ffffff" fill-opacity=".91"/>
{txt(450,1157, 'GALLERYGO · 演示样例 / DEMO · '+label, 20, '#6b7280',500,'middle')}</svg>'''

def receipt(provider="GoPay", name="Andi", amount="250.000", variant=0):
    color = '#00A7CB' if provider == 'GoPay' else '#159EE6'
    body=f'<rect x="72" y="58" width="756" height="1000" rx="36" fill="white"/>'
    body+=txt(115,150,provider,55,color,700)+txt(115,205,'Bukti transaksi',29,'#8894a5')
    body+='<circle cx="450" cy="310" r="50" fill="#E8F7EF"/><path d="m428 309 15 16 30-33" fill="none" stroke="#28A16A" stroke-width="10" stroke-linecap="round"/>'
    body+=txt(450,414,'Transfer berhasil',39,'#24334a',700,'middle')+txt(450,495,'Rp '+amount,63,'#172336',700,'middle')
    body+='<path d="M116 555H784" stroke="#EAF0F4" stroke-width="2"/>'
    rows=[('Penerima',name),('Pengirim','Rina (demo)'),('Tanggal','12 Juni 2026, 14:32'),('ID Transaksi','GG-DEMO-0612'),('Catatan','Pembayaran pesanan')]
    for i,(key,val) in enumerate(rows):
        y=620+i*76
        body+=txt(116,y,key,26,'#8B96A5')+txt(784,y,val,28,'#253249',600,'end')
    body+='<rect x="116" y="990" width="668" height="40" rx="15" fill="#EFF8FF"/>'+txt(450,1019,'Contoh tampilan · bukan bukti pembayaran',19,'#7291AE',400,'middle')
    return base(body,'#EAF7FD','PAYMENT',variant)

def order(alternate=False, variant=0):
    name='Tokopedia' if alternate else 'Shopee'
    accent='#23A36D' if alternate else '#F57438'
    product='Beras premium 5 kg' if alternate else 'Kemeja biru · Size M'
    price='129.000' if alternate else '235.000'
    body='<rect x="55" y="45" width="790" height="1040" rx="34" fill="white"/>'
    body+=txt(98,135,name,52,accent,700)+txt(98,196,'Detail pesanan',33,'#253249',700)
    body+=f'<rect x="90" y="240" width="720" height="125" rx="22" fill="{accent}" fill-opacity=".10"/>'+txt(125,298,'Pesanan dalam pengiriman',32,accent,700)+txt(125,340,'Pesanan telah dibayar',24,'#6c798a')
    body+='<rect x="98" y="410" width="185" height="195" rx="24" fill="#E1EAF5"/><path d="m153 452 24 19 24-19 40 35-21 34-18-15v67h-51v-67l-18 15-21-34z" fill="#6F99D6"/>'
    body+=txt(315,455,product,29,'#26344B',600)+txt(315,505,'1 barang',25,'#9AA3AE')+txt(315,566,'Rp '+price,39,'#1D2D47',700)
    for y,k,v in [(700,'Nomor pesanan','GG-260612-108'),(778,'Pengiriman','J&T Express'),(856,'Nomor resi','DEMO-JKT-0612'),(934,'Total pembayaran','Rp '+('129.000' if alternate else '250.000'))]:
        body+=txt(98,y,k,25,'#8A95A5')+txt(802,y+38,v,30,'#24334A',600,'end')
    return base(body,'#FFF2E9' if not alternate else '#E6F6EE','ORDER',variant)

def chat(family=False, variant=0):
    name='Keluarga' if family else 'Andi'
    body='<rect x="45" y="40" width="810" height="1050" rx="35" fill="#EFEAE1"/><path d="M45 75q0-35 35-35h740q35 0 35 35v142H45Z" fill="#147D69"/><circle cx="127" cy="128" r="44" fill="#B3D8C8"/>'
    body+=txt(202,122,name,38,'white',700)+txt(202,166,'online',23,'#C1E4D9')
    body+='<rect x="309" y="252" width="282" height="50" rx="14" fill="#E1EBE4"/>'+txt(450,287,'12 JUNI 2026',22,'#65796E',400,'middle')
    messages=['Lebaran bersama keluarga?','Iya, sampai jumpa di rumah!','Jangan lupa foto keluarga ya.'] if family else ['Halo, transfernya sudah masuk?','Sudah ya. Rp250.000 ke Andi.','Terima kasih! Ini buktinya.']
    for i,message in enumerate(messages):
        x=100 if i%2==0 else 180; y=365+i*168
        body+=f'<rect x="{x}" y="{y}" width="620" height="112" rx="22" fill="{"white" if i%2==0 else "#D8F6CA"}"/>'
        body+=txt(x+26,y+48,message,26,'#243A32')+txt(x+590,y+91,'14:3'+str(i),19,'#9CA99F',400,'end')
    body+='<rect x="100" y="900" width="530" height="130" rx="20" fill="white"/>'+txt(130,952,'✓ Transfer berhasil' if not family else '✧ Selamat Idul Fitri',28,'#23846E',700)+txt(130,1002,'Rp250.000 · Andi' if not family else 'Momen bersama keluarga',28,'#4A5B55')
    return base(body,'#EAF2EE','CHAT',variant)

def document(ticket=False, variant=0):
    body='<rect x="65" y="125" width="770" height="900" rx="30" fill="#FCFCFA"/>'
    body+='<rect x="65" y="125" width="770" height="175" rx="30" fill="#DDEAF0"/>'
    body+=txt(450,200,'TIKET PERJALANAN' if ticket else 'KARTU IDENTITAS · CONTOH',32,'#3E687C',700,'middle')+txt(450,253,'DOKUMEN DEMO / BUKAN DOKUMEN RESMI',18,'#65899B',400,'middle')
    body+='<rect x="580" y="352" width="180" height="205" rx="20" fill="#C5D7E2"/><circle cx="670" cy="417" r="39" fill="#8CA8BB"/><path d="M608 527c0-75 124-75 124 0" fill="#8CA8BB"/>'
    for i,(k,v) in enumerate([('Nama','BUDI CONTOH'),('Nomor','DEMO-0000'),('Tanggal','12 Juni 2026'),('Alamat','Jakarta · Indonesia')]):
        y=390+i*115
        body+=txt(110,y,k,25,'#8B9AA3')+txt(110,y+45,v,32,'#3C5365',600)
    body+='<path d="M110 900H790" stroke="#D3DEE5" stroke-width="3"/>'+txt(450,966,'Contoh data untuk demonstrasi',25,'#8AA0AF',400,'middle')
    return base(body,'#E8EFF5','DOCUMENT',variant)

def work(menu=False, variant=0):
    if menu:
        body='<rect x="65" y="100" width="770" height="950" rx="30" fill="#FFF9EA"/>'+txt(450,240,'WARUNG KOPI',63,'#77583E',700,'middle')+txt(450,315,'MENU HARI INI',29,'#B18C67',600,'middle')
        for i,(name,price) in enumerate([('Kopi susu','Rp18.000'),('Es kopi gula aren','Rp22.000'),('Teh hangat','Rp10.000'),('Roti panggang','Rp20.000')]):
            y=465+i*135; body+=txt(120,y,name,32,'#725A45')+txt(780,y+48,price,31,'#A98157',700,'end')
    else:
        body='<rect width="900" height="1200" fill="#D4B89A"/><path d="M0 820 900 690v510H0Z" fill="#BD9675"/><ellipse cx="448" cy="795" rx="287" ry="92" fill="#AE8566"/><ellipse cx="440" cy="772" rx="275" ry="100" fill="#F6EADC"/><path d="M244 475h389v222c0 140-389 140-389 0Z" fill="#F5E8D8"/><path d="M633 524c150-20 150 176 0 157" fill="none" stroke="#F5E8D8" stroke-width="47"/><ellipse cx="439" cy="478" rx="195" ry="73" fill="#8D5939"/><path d="M439 522c-155-90-60-117 0-49 60-68 155-41 0 49" fill="#EFD7BB"/>'+txt(450,185,'KOPI SUSU',70,'#6D4B33',700,'middle')+txt(450,251,'Materi promosi · Warung Kopi',27,'#816044',400,'middle')+txt(450,994,'Freshly brewed. Made for your day.',26,'#765137',400,'middle')
    return base(body,'#F4E8DA','WORK',variant)

def festival(beach=False, variant=0):
    if beach:
        body='<rect width="900" height="1200" fill="#93CDE2"/><circle cx="690" cy="200" r="83" fill="#FFF2B6"/><path d="M0 590q225-80 450 0t450 0v610H0" fill="#54AFBC"/><path d="M0 805q450-100 900 60v335H0" fill="#EED1A2"/>'+txt(70,113,'Liburan keluarga',48,'#247985',700)
    else:
        body='<rect width="900" height="1200" fill="#276F61"/><circle cx="704" cy="210" r="90" fill="#E9CF8A"/><circle cx="743" cy="174" r="83" fill="#276F61"/><path d="M0 730h900v470H0" fill="#DFE4CF"/><path d="M80 730V520h55v-80h40v80h55v210M288 730V510q165-200 330 0v220M690 730V520h55v-80h40v80h55v210" fill="#388577"/>'+txt(75,155,'Selamat',53,'#F5E4B2',500)+txt(75,235,'Idul Fitri',85,'white',700)
    for x,y,r,color in [(260,850,59,'#A9C8BB'),(450,810,69,'#DFC4A0'),(650,870,52,'#D9A8A0')]:
        body+=f'<circle cx="{x}" cy="{y}" r="{r}" fill="#D8B193"/><path d="M{x-90} 1100v-110q0-130 180 0v110Z" fill="{color}"/>'
    body+=txt(450,1075,'Momen bersama keluarga',32,'#386E64',600,'middle')
    return base(body,'#E3F2E8','LIFE',variant)

records=[]
definitions=[
    ('payment',receipt, ['GoPay 转账凭证','GoPay 清晰凭证','GoPay 连续截图','DANA 转账记录'],['gopay','transfer','andi']),
    ('order',order,['Shopee 购物订单','Shopee 清晰订单','Shopee 订单截图','Tokopedia 购物记录'],['pesanan','belanja','shopee']),
    ('chat',chat,['WhatsApp 转账对话','WhatsApp 清晰对话','WhatsApp 聊天截图','家庭群聊'],['whatsapp','chat','percakapan']),
    ('idcard',document,['证件资料样例','清晰证件样例','证件连续拍照','旅行票据样例'],['dokumen','identitas','ktp']),
    ('work',work,['咖啡经营素材','清晰产品照片','咖啡相似照片','门店菜单'],['usaha','kerja','kopi']),
    ('festival',festival,['家庭节庆合照','推荐家庭合照','节庆相似照片','家庭旅行'],['lebaran','keluarga','liburan']),
]
for group,(category,renderer,titles,tags) in enumerate(definitions):
    group_ids=[f'{group*4+i+1:03d}' for i in range(3)]
    for variant in range(4):
        ident=f'{group*4+variant+1:03d}'
        if category=='payment':
            svg=renderer('DANA' if variant==3 else 'GoPay','Budi' if variant==3 else 'Andi','50.000' if variant==3 else '250.000',variant)
            ocr=f'{"DANA" if variant==3 else "GoPay"} Transfer berhasil Pengirim Rina Penerima {"Budi" if variant==3 else "Andi"} Rp {"50.000" if variant==3 else "250.000"} 12 Juni 2026'
            photo_tags=['dana','transfer','budi'] if variant==3 else tags
        else:
            svg=renderer(variant==3,variant)
            ocr={'order':'Pesanan dibayar Shopee Kemeja biru J&T resi GG-260612-108 Rp250.000','chat':'WhatsApp Andi Transfer Rp250.000 Terima kasih','idcard':'Dokumen contoh BUDI CONTOH Jakarta Indonesia','work':'Warung Kopi Materi usaha Kopi susu Rp18.000','festival':'Selamat Idul Fitri Lebaran keluarga liburan'}[category]
            photo_tags=tags
        filename=f'{ident}.svg'
        (IMAGES/filename).write_text(svg,encoding='utf-8')
        other_category=(group+1)%6
        related=[f'{group*4+i+1:03d}' for i in range(4) if i!=variant]
        related += [f'{other_category*4+i+1:03d}' for i in range(4)]
        if category=='payment': related=[x for x in related if int(x)<=4]+['009','010','011']
        if category=='festival': related=[x for x in related if int(x)>=21]+['012','016','004']
        records.append({'id':ident,'thumb':f'images/{filename}','full':f'images/{filename}','category':category,'title':titles[variant],'ocr_text':ocr,'tags':photo_tags,'similar_ids':[x for x in group_ids if x!=ident] if variant<3 else [],'recommended':variant in (1,3),'tag_suggestion_ids':list(dict.fromkeys(related))[:5],'date':'2026-06-12','sample':True})

mapping={
    'gopay':['001','002','003'],'dana':['004'],'transfer':['001','002','003','004'],
    'bukti transfer minggu lalu':['001','002','003','004'],'transfer ke andi':['001','002','003'],
    '上周转账记录':['001','002','003','004'],'转账凭证':['001','002','003','004'],
    'pesanan':['005','006','007','008'],'shopee':['005','006','007'],'tokopedia':['008'],
    'resi':['005','006','007','008'],'paket':['005','006','007','008'],'订单':['005','006','007','008'],
    'whatsapp':['009','010','011','012'],'chat':['009','010','011','012'],'聊天':['009','010','011','012'],
    'dokumen':['013','014','015','016'],'ktp':['013','014','015'],'证件':['013','014','015','016'],
    'kerja':['017','018','019','020'],'usaha':['017','018','019','020'],'kopi':['017','018','019','020'],
    '工作':['017','018','019','020'],'lebaran':['021','022','023'],'keluarga':['012','021','022','023','024'],
    'liburan':['024'],'节庆':['021','022','023'],'家庭':['012','021','022','023','024'],
}
data={'meta':{'version':1,'sample':True,'sample_note':'本地示例素材 · 分析与学习结果为预设演示','search_examples':['bukti transfer minggu lalu','pesanan','keluarga'],'search_suggestions':[{'label':'上周的转账凭证','query':'bukti transfer minggu lalu','photo_id':'001'},{'label':'我的购物订单与物流','query':'pesanan','photo_id':'005'},{'label':'WhatsApp 中的聊天截图','query':'whatsapp','photo_id':'009'}]},'photos':records,'categories':CATEGORIES,'search_mapping':mapping}
(ROOT/'data.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(IMAGES/'placeholder.svg').write_text(base('<rect x="180" y="300" width="540" height="470" rx="40" fill="#DEE8F6"/>'+txt(450,885,'GalleryGo · 示例图片',36,'#7A8FAB',500,'middle'),'#F3F6FC','PLACEHOLDER'),encoding='utf-8')
print(f'Generated {len(records)} local sample images and data.json')
