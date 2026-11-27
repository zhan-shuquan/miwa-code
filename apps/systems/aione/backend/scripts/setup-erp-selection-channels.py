"""Explicit ERP 8081 selection-channel setup. Does not change employee roles.

Run only after reviewed backup. Existing channel rows are never overwritten.
The ERP table is the source of truth; AIONE consumes its connector snapshot.
"""
import frappe

CHANNELS = [
    ('1688','1688阿里巴巴','货源开发／同款搜索','https://www.1688.com/','purchase','1688'),
    ('taobao','淘宝','货源开发／同款搜索','https://www.taobao.com/','purchase','淘'),
    ('pdd','拼多多','货源开发／同款搜索','https://www.pinduoduo.com/','purchase','拼'),
    ('instagram','Instagram','社交媒体／流行趋势','https://www.instagram.com/','market','IG'),
    ('xiaohongshu','小红书','社交媒体／流行趋势','https://www.xiaohongshu.com/','market','红'),
    ('tiktok','TikTok','社交媒体／流行趋势','https://www.tiktok.com/','market','♪'),
    ('douyin','抖音','社交媒体／流行趋势','https://www.douyin.com/','market','抖'),
    ('pinterest','Pinterest','社交媒体／流行趋势','https://www.pinterest.com/','market','P'),
    ('youtube','YouTube','社交媒体／流行趋势','https://www.youtube.com/','market','▶'),
    ('x','X','社交媒体／流行趋势','https://x.com/','market','X'),
    ('rakuten','楽天ランキング','日本电商／热销排行榜','https://ranking.rakuten.co.jp/','market','R'),
    ('amazon-jp','Amazon日本畅销榜','日本电商／热销排行榜','https://www.amazon.co.jp/gp/bestsellers/','market','a'),
    ('yahoo-jp','Yahoo! Shopping排行榜','日本电商／热销排行榜','https://shopping.yahoo.co.jp/categoryranking/','market','Y!'),
    ('mercari','メルカリ','日本电商／热销排行榜','https://jp.mercari.com/','market','m'),
    ('qoo10','Qoo10','日本电商／热销排行榜','https://www.qoo10.jp/','market','Q'),
    ('tiktok-shop-jp','TikTok Shop Japan','日本电商／热销排行榜','https://www.tiktok.com/?lang=ja-JP','market','♪'),
    ('temu','Temu','跨境电商／趋势分析','https://www.temu.com/','market','T'),
    ('shein','SHEIN','跨境电商／趋势分析','https://www.shein.com/','market','S'),
    ('google-trends','Google Trends','跨境电商／趋势分析','https://trends.google.com/trends/','market','G'),
    ('tiktok-creative','TikTok Creative Center','跨境电商／趋势分析','https://ads.tiktok.com/business/creativecenter/','market','♪'),
]

def setup():
    if frappe.local.site != 'miwa-dev.localhost':
        raise RuntimeError('This release is restricted to the reviewed ERP 8081 site')
    name = 'MIWA Selection Channel'
    if not frappe.db.exists('DocType', name):
        fields = [
            dict(fieldname='channel_code',label='渠道代码',fieldtype='Data',reqd=1,unique=1),
            dict(fieldname='channel_name',label='渠道名称',fieldtype='Data',reqd=1,in_list_view=1),
            dict(fieldname='channel_group',label='选品来源分类',fieldtype='Select',reqd=1,
                 options='货源开发／同款搜索\n社交媒体／流行趋势\n日本电商／热销排行榜\n跨境电商／趋势分析',in_list_view=1),
            dict(fieldname='official_url',label='官方网站／排行榜',fieldtype='Data',options='URL',reqd=1),
            dict(fieldname='source_kind',label='来源类型',fieldtype='Select',options='purchase\nmarket',reqd=1),
            dict(fieldname='icon_text',label='平台图标简称',fieldtype='Data'),
            dict(fieldname='entry_note',label='入口说明',fieldtype='Small Text'),
            dict(fieldname='sort_order',label='显示顺序',fieldtype='Int'),
            dict(fieldname='enabled',label='启用',fieldtype='Check',default='1',in_list_view=1),
        ]
        frappe.get_doc(dict(doctype='DocType',name=name,module='Custom',custom=1,
            autoname='field:channel_code',title_field='channel_name',track_changes=1,
            fields=fields,permissions=[dict(role='System Manager',read=1,write=1,create=1,
                delete=0,report=1,export=1)])).insert()
    inserted=[]
    for order,row in enumerate(CHANNELS,1):
        code,label,group,url,kind,icon=row
        if frappe.db.exists(name,code):
            continue
        frappe.get_doc(dict(doctype=name,channel_code=code,channel_name=label,
            channel_group=group,official_url=url,source_kind=kind,icon_text=icon,
            sort_order=order,enabled=1,
            entry_note='日本Shop商品主要在TikTok App内浏览；此入口打开TikTok日本站。' if code=='tiktok-shop-jp' else '')).insert()
        inserted.append(code)
    return {'inserted':inserted,'existingPreserved':len(CHANNELS)-len(inserted)}
