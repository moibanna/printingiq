"""Tests for the sync helpers:  python3 -m unittest discover -s scripts/sync"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from classify import category_for, find_price, lang_of  # noqa: E402
from generic import _post_product, parse_telegram  # noqa: E402
import exchange  # noqa: E402
import linked  # noqa: E402


class Categories(unittest.TestCase):
    def test_examples(self):
        cases = {
            'ACRYLIC SHEET 3MM RED 122x244': 'acrylic',
            'لوح اكريليك شفاف 2 ملم': 'acrylic',
            'ئەکریلیکی سوور ٣ ملم': 'acrylic',
            'Alucobond 4mm silver': 'acp',
            'فوم بورد ابيض 5 ملم': 'foam',
            'فلكس 440 غرام لمبة': 'flex',
            'Eco solvent printer 3.2m': 'large-format',
            'طابعة سولفنت 3.2 متر': 'large-format',
            'CO2 Laser engraving machine 1390': 'laser-cnc',
            'ماكنة ليزر 1390': 'laser-cnc',
            'LED module 3 lamp white': 'led',
            'حروف بارزة ليد نيون': 'led',
            'Vinyl cutter 60cm': 'plotter',
            'Heat press 5 in 1': 'heat-press',
            'شريط شمع للطباعة الحرارية زيبرا 110x74 مم': 'toner',
            'طابعة ملصقات مكتبية 203 نقطة في الانج زيبرا': 'office-print',
            'Canon toner 725': 'toner',
            'طابعة ليزر ملونة Brother HL-L3220CW': 'office-print',
            'طابعة Brother HL-L2365DW ليزر أحادية اللون': 'office-print',
            'طقم هدايا مع تغليف مع غلق مغناطيسي': 'gift-box',
            'مقص ديلي 195 ملم': 'office-supplies',
            'قلم حبر جاف كلاسيكي من MOLESKINE': 'pens',
            'Deli marker 1.8mm blue': 'pens',
            'دفتر ملاحظات A5': 'notebooks',
            'Casio calculator FX-991': 'calculators',
            'Roll up stand 85x200': 'stands',
            'Crystal award with box': 'crystal',
            'Thermos 500ml steel': 'thermos',
            'Gift set: pen + notebook': 'gift-box',
            'Laptop backpack grey': 'laptop-bags',
            'دباسة ديلي متوسطة': 'office-supplies',
        }
        for text, want in cases.items():
            with self.subTest(text=text):
                self.assertEqual(category_for(text), want)

    def test_not_print_related(self):
        for text in ['ماوس لاسلكي شاومي', 'Honeywell scanner HF680', 'لافتة سلامة ISO – نافذة طوارئ', 'Samsung 55" LED TV', 'Capacity 5L',
                     'منشار حديد مسطح 12 بوصة دِلي', 'فيتة ليزرية 40 متر ديلي', 'المعدات اليدوية', 'الكابلات',
                     'كبان ليزري خماسي ديلي', 'جهاز راوتر كهربائي من ديلي', 'ليدن مجموعة زجاجات المياه',
                     'مقص تقليم حدائق ديلي', 'مقص بي ار سي 8 إنج ديلي', 'حامل بطاقات مغناطيسي مع ستاند للهاتف']:
            with self.subTest(text=text):
                self.assertIsNone(category_for(text))

    def test_fallback_text(self):
        self.assertEqual(category_for('Model X-200', 'Cutting plotters'), 'plotter')
        # The shop's own category decides when the title alone says nothing
        self.assertEqual(category_for('مجموعة الكتابة الذكية Moleskine Ellipse', 'الدفاتر والمفكرات'), 'notebooks')


class Prices(unittest.TestCase):
    def test_formats(self):
        self.assertEqual(find_price('Acrylic 3mm — $25 per sheet'), (25, 'USD'))
        self.assertEqual(find_price('السعر 30 دولار'), (30, 'USD'))
        self.assertEqual(find_price('السعر: 15,000 دينار'), (15000, 'IQD'))
        self.assertEqual(find_price('بسعر 15 الف دينار فقط'), (15000, 'IQD'))
        self.assertEqual(find_price('نرخ ٢٥ هەزار دینار'), (25000, 'IQD'))
        self.assertEqual(find_price('price: 12.5$'), (12.5, 'USD'))
        self.assertEqual(find_price('السعر 120000'), (120000, 'IQD'))
        self.assertEqual(find_price('no price here, call 07701234567'), (None, None))


class Language(unittest.TestCase):
    def test_lang(self):
        self.assertEqual(lang_of('ئەکریلیکی سوور'), 'ckb')
        self.assertEqual(lang_of('لوح اكريليك'), 'ar')
        self.assertEqual(lang_of('Acrylic sheet'), 'en')


TG_PAGE = '''
<div class="tgme_widget_message_wrap js-widget_message_wrap"><div class="tgme_widget_message" data-post="signshop/101">
 <a class="tgme_widget_message_photo_wrap 1 2" href="https://t.me/signshop/101" style="width:800px;background-image:url('https://cdn.example/p101.jpg')"></a>
 <div class="tgme_widget_message_text js-message_text" dir="auto">لوح اكريليك 3 ملم الوان<br/>السعر 25 الف دينار<br/>للطلب واتساب</div>
 <a class="tgme_widget_message_date" href="https://t.me/signshop/101"><time datetime="2026-11-20T10:00:00+00:00" class="time">10:00</time></a>
</div></div>
<div class="tgme_widget_message_wrap js-widget_message_wrap"><div class="tgme_widget_message" data-post="signshop/102">
 <div class="tgme_widget_message_text js-message_text" dir="auto">Eid Mubarak to all our customers!</div>
 <a class="tgme_widget_message_date" href="https://t.me/signshop/102"><time datetime="2026-11-21T10:00:00+00:00" class="time">10:00</time></a>
</div></div>
'''


class Telegram(unittest.TestCase):
    def test_parse_and_product(self):
        posts = parse_telegram(TG_PAGE, 'signshop')
        self.assertEqual([p['id'] for p in posts], ['101', '102'])
        self.assertEqual(posts[0]['images'], ['https://cdn.example/p101.jpg'])
        src = {'id': 'signshop', 'name': 'Sign Shop'}
        p = _post_product(src, '101', posts[0]['text'], posts[0]['images'], posts[0]['date'], posts[0]['url'])
        self.assertEqual(p['categoryId'], 'acrylic')
        self.assertEqual((p['price'], p['currency']), (25000, 'IQD'))
        self.assertEqual(p['name']['ar'], 'لوح اكريليك 3 ملم الوان')
        self.assertEqual(p['sourceUrl'], 'https://t.me/signshop/101')
        # A greeting post without a product photo is skipped
        self.assertIsNone(_post_product(src, '102', posts[1]['text'], posts[1]['images'], posts[1]['date'], posts[1]['url']))


ARTICLE = """<script type="application/ld+json">{"datePublished": "2026-11-24T14:13:14+00:00"}</script>
<p>The US dollar closed Tuesday&rsquo;s trading lower in Iraq, hovering around 169,000 dinars per 100 dollars.</p>
<p>According to a Shafaq News market survey, the dollar traded in Baghdad&rsquo;s Al-Kifah and Al-Harithiya exchanges at
168,900 dinars per 100 dollars, down from the morning session&rsquo;s 169,350 dinars.</p>
<p>In the Iraqi capital, exchange shops sold the dollar at 169,500 dinars and bought it at 168,500 dinars, while in Erbil,
selling prices stood at 169,450 dinars and buying prices at 169,350 dinars.</p>"""
LISTING = '<a href="/en/Economy/Dollar-falls-in-Baghdad-Erbil-markets-1">x</a><a href="/en/Economy/Iranian-toman">y</a>'


class ExchangeRate(unittest.TestCase):
    def setUp(self):
        self._saved = exchange.get_text, exchange.allowed
        exchange.allowed = lambda url: True
        self.pages = {'https://shafaq.com/en/Economy': LISTING,
                      'https://shafaq.com/en/Economy/Dollar-falls-in-Baghdad-Erbil-markets-1': ARTICLE}
        exchange.get_text = lambda url: self.pages[url]

    def tearDown(self):
        exchange.get_text, exchange.allowed = self._saved

    def test_parse_article(self):
        self.assertEqual(exchange.parse_article(ARTICLE), (1689, '2026-11-24'))
        self.assertEqual(exchange.parse_article('<p>sold the dollar at 179,000 dinars</p>'), (1790, ''))
        self.assertIsNone(exchange.parse_article('<p>Oil prices rose</p>'))

    def test_market_rate(self):
        rate, _ = exchange.daily_rate(None, None, '2026-11-25')
        self.assertEqual((rate['iqdPerUsd'], rate['date'], rate['manual'], rate['market']), (1689, '2026-11-24', False, True))
        self.assertTrue(rate['sourceUrl'].endswith('Dollar-falls-in-Baghdad-Erbil-markets-1'))
        # An old official-rate value doesn't block the switch to the market rate
        rate, _ = exchange.daily_rate(None, {'iqdPerUsd': 1515, 'date': '2026-11-24'}, '2026-11-25')
        self.assertEqual(rate['iqdPerUsd'], 1689)

    def test_manual_override(self):
        rate, _ = exchange.daily_rate({'override': 1790}, None, '2026-11-25')
        self.assertEqual((rate['iqdPerUsd'], rate['manual']), (1790, True))

    def test_bad_value_keeps_previous(self):
        prev = {'iqdPerUsd': 1700, 'date': '2026-11-24', 'market': True}
        self.pages['https://shafaq.com/en/Economy/Dollar-falls-in-Baghdad-Erbil-markets-1'] = ARTICLE.replace('168,900', '99,000')
        self.assertEqual(exchange.daily_rate(None, prev, '2026-11-25')[0], prev)  # 990: out of bounds
        self.pages['https://shafaq.com/en/Economy/Dollar-falls-in-Baghdad-Erbil-markets-1'] = ARTICLE.replace('168,900', '258,900')
        self.assertEqual(exchange.daily_rate(None, prev, '2026-11-25')[0], prev)  # +52% in a day
        self.assertEqual(exchange.daily_rate(None, prev, '2026-12-25')[0], prev)  # report a month old

        def down(url):
            raise OSError('offline')
        exchange.get_text = down
        self.assertEqual(exchange.daily_rate(None, prev, '2026-11-25')[0], prev)


class LinkedShops(unittest.TestCase):
    def test_detect(self):
        self.assertEqual(linked.detect('https://t.me/s/zanasign'), {'adapter': 'telegram', 'channel': 'zanasign'})
        self.assertEqual(linked.detect('t.me/zanasign'), {'adapter': 'telegram', 'channel': 'zanasign'})
        self.assertEqual(linked.detect('https://www.instagram.com/zana.sign/'), {'adapter': 'instagram', 'username': 'zana.sign'})
        self.assertEqual(linked.detect('https://shop.example.iq/collections/all?x=1'), {'adapter': 'website', 'url': 'https://shop.example.iq'})
        with self.assertRaises(ValueError):
            linked.detect('https://www.facebook.com/zanasign')

    def test_sources_and_claims(self):
        v = {'id': 'u1', 'name': 'Zana Sign', 'city': 'Erbil', 'phone': '0750', 'whatsapp': None, 'email': None, 'about': None}
        links = [
            {'id': 'l1', 'kind': 'import', 'url': 't.me/zanasign', 'source_id': None, 'vendor_id': 'u1', 'vendors': v},
            {'id': 'l2', 'kind': 'claim', 'url': '', 'source_id': 'toolmart', 'vendor_id': 'u2', 'vendors': v},
        ]
        [src] = linked.sources(links)
        self.assertEqual((src['id'], src['adapter'], src['channel'], src['name']), ('u1', 'telegram', 'zanasign', 'Zana Sign'))
        vendors, products = linked.apply_claims(
            [{'id': 'toolmart', 'name': 'Toolmart'}, {'id': 'penna', 'name': 'Penna'}],
            [{'id': 'toolmart-1', 'vendorId': 'toolmart'}, {'id': 'penna-1', 'vendorId': 'penna'}], linked.claims(links))
        self.assertEqual([v['id'] for v in vendors], ['u2', 'penna'])
        self.assertEqual([p['vendorId'] for p in products], ['u2', 'penna'])


if __name__ == '__main__':
    unittest.main()
