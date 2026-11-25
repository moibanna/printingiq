"""Tests for the sync helpers:  python3 -m unittest discover -s scripts/sync"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from classify import category_for, find_price, lang_of  # noqa: E402
from generic import _post_product, parse_telegram  # noqa: E402


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


if __name__ == '__main__':
    unittest.main()
